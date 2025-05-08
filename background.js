// utils.js에서 함수 가져오기
importScripts('utils.js');

// 초기화 시 저장소 구조 확인
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['memoryPalace'], function(result) {
    if (!result.memoryPalace) {
      // 저장소가 없으면 초기화 - URL 기반 구조 적용
      chrome.storage.local.set({
        memoryPalace: {
          items: [],
          groups: {},
          lastUpdate: Date.now()
        }
      });
    }
  });
  
  // 컨텍스트 메뉴 항목 추가
  createContextMenus();
});

// 컨텍스트 메뉴 생성 함수
function createContextMenus() {
  // 기존 메뉴 모두 삭제
  chrome.contextMenus.removeAll(function() {
    // 메모리 팰리스 뷰어 메뉴 추가
    chrome.contextMenus.create({
      id: "viewMemoryPalace",
      title: "View Memory Palace",
      contexts: ["all"]
    });
    
    // 이미지 저장 메뉴 추가
    chrome.contextMenus.create({
      id: "saveImageToMemoryPalace",
      title: "Save Image to Memory Palace",
      contexts: ["image"]
    });
  });
}

// 메시지 리스너 수정
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background received message:', request.action);
  
  if (request.action === 'addItem') {
    // 콘솔 로그 추가 (디버깅용)
    console.log('Add Item Request Received:', request.item);

    try {
      // 콜백 함수를 사용한 비동기 처리
      addItemToMemoryPalace(request.item, sender.tab ? sender.tab.id : null, (result) => {
        // 명시적으로 응답 전송
        sendResponse(result);
      });
      
      // 비동기 응답을 위해 true 반환
      return true;
    } catch (error) {
      console.error('Error in addItem listener:', error);
      sendResponse({ success: false, error: error.message });
      return true;
    }
  } else if (request.action === 'getItems') {
    // 저장된 아이템 가져오기
    getMemoryPalaceItems(sendResponse);
    return true;
  } else if (request.action === 'registerContextMenu') {
    // 컨텍스트 메뉴 재등록 (페이지 로드 시마다 호출됨)
    createContextMenus();
    sendResponse({ success: true });
    return false;
  }
});

// URL 기반 고유 키 생성 함수 수정
function createUniqueKey(url) {
  try {
    const urlObj = new URL(url);
    // 프로토콜, 호스트, 경로를 조합하여 고유한 키 생성
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    return url; // URL 형식이 아니면 원래 값 사용
  }
}

function addItemToMemoryPalace(item, tabId, callback) {
  chrome.storage.local.get(['memoryPalace'], function(result) {
    console.log('현재 메모리 팰리스:', result.memoryPalace);
    console.log('추가할 아이템:', item);

    const memoryPalace = result.memoryPalace || { 
      items: [], 
      groups: {}, 
      lastUpdate: Date.now() 
    };

    // URL 기반 고유 키 생성
    const urlKey = createUniqueKey(item.url);
    console.log('생성된 URL 키:', urlKey);

    // 현재 시간보다 매우 큰 미래 시간 사용 (1일 후)
    const futureTime = Date.now() + (24 * 60 * 60 * 1000);
    
    // 그룹이 없으면 새로 생성
    if (!memoryPalace.groups[urlKey]) {
      memoryPalace.groups[urlKey] = {
        url: item.url,
        pageTitle: item.pageTitle,
        position: getRandomPositionAvoidingCenter(),
        customTitle: '', // 사용자 지정 제목 초기화
        items: [],
        createdAt: futureTime, // 미래 시간으로 생성 시간 설정
        lastUpdate: futureTime  // 미래 시간으로 업데이트 시간 설정
      };
      console.log('새 그룹 생성 (미래 타임스탬프 사용):', memoryPalace.groups[urlKey]);
    } else {
      // 기존 그룹의 lastUpdate 시간 업데이트
      memoryPalace.groups[urlKey].lastUpdate = Date.now();
    }

    // 아이템 중복 확인 및 추가 로직 (기존과 동일)
    if (item.type === 'text') {
      const existingItem = memoryPalace.groups[urlKey].items.find(
        i => i.type === 'text' && i.content.toLowerCase() === item.content.toLowerCase()
      );
      
      if (existingItem) {
        existingItem.fontSize = (existingItem.fontSize || 14) + 2;
        existingItem.count = (existingItem.count || 1) + 1;
        existingItem.timestamp = Date.now();
        console.log('기존 텍스트 아이템 업데이트:', existingItem);
      } else {
        item.id = generateId();
        item.fontSize = 14;
        item.count = 1;
        item.timestamp = Date.now();
        memoryPalace.groups[urlKey].items.push(item);
        memoryPalace.items.push(item.id);
        console.log('새 텍스트 아이템 추가:', item);
      }
    } 
    else if (item.type === 'image') {
      item.id = generateId();
      item.timestamp = Date.now();
      memoryPalace.groups[urlKey].items.push(item);
      memoryPalace.items.push(item.id);
      console.log('새 이미지 아이템 추가:', item);
    }
    
    // 마지막 업데이트 시간 기록
    memoryPalace.lastUpdate = Date.now();
    
    // 업데이트된 메모리 팰리스 저장
    chrome.storage.local.set({ memoryPalace }, function() {
      console.log('메모리 팰리스 저장 성공');
      
      // 저장 완료 알림
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          action: 'itemSaved',
          success: true
        }).catch(err => {
          console.error('탭에 메시지 전송 실패', err);
        });
      }
      
      // 콜백으로 응답
      callback({ success: true });
    });
  });
}

// 메모리 팰리스 아이템 가져오기
function getMemoryPalaceItems(callback) {
  chrome.storage.local.get(['memoryPalace'], function(result) {
    callback(result.memoryPalace || { items: [], groups: {}, lastUpdate: Date.now() });
  });
}

// 중앙을 피하는 랜덤 위치 생성
function getRandomPositionAvoidingCenter() {
  // 화면을 4개의 구역으로 나누고, 중앙 부분을 피함
  const areas = [
    { xMin: 5, xMax: 30, yMin: 5, yMax: 30 },     // 좌측 상단
    { xMin: 70, xMax: 95, yMin: 5, yMax: 30 },    // 우측 상단
    { xMin: 5, xMax: 30, yMin: 70, yMax: 95 },    // 좌측 하단
    { xMin: 70, xMax: 95, yMin: 70, yMax: 95 }    // 우측 하단
  ];
  
  // 랜덤하게 영역 선택
  const area = areas[Math.floor(Math.random() * areas.length)];
  
  // 선택된 영역 내에서 랜덤 위치 생성
  return {
    x: Math.floor(Math.random() * (area.xMax - area.xMin + 1)) + area.xMin,
    y: Math.floor(Math.random() * (area.yMax - area.yMin + 1)) + area.yMin
  };
}

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "viewMemoryPalace") {
    // 메모리 팰리스 뷰어 페이지 열기
    chrome.tabs.create({
      url: "viewer.html"
    });
  } 
  else if (info.menuItemId === "saveImageToMemoryPalace") {
    // 선택한 이미지를 메모리 팰리스에 저장
    console.log('이미지 저장 요청:', info.srcUrl);
    
    if (tab && tab.id && info.srcUrl) {
      // 컨텐츠 스크립트에 이미지 저장 명령 전송
      chrome.tabs.sendMessage(tab.id, {
        action: 'saveImage',
        imageUrl: info.srcUrl
      }).catch(err => {
        console.error('이미지 저장 메시지 전송 실패:', err);
        
        // 직접 이미지 정보 생성 및 저장 (대체 방법)
        const imageInfo = {
          type: 'image',
          content: info.srcUrl,
          url: info.pageUrl || tab.url,
          pageTitle: tab.title || 'Unknown Page',
          timestamp: Date.now(),
          position: {
            x: 0,
            y: 0
          },
          scrollPosition: 0
        };
        
        addItemToMemoryPalace(imageInfo, tab.id, function(result) {
          console.log('직접 이미지 저장 결과:', result);
        });
      });
    }
  }
});