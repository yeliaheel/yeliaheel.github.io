// 페이지 로드 시 메모리 팰리스 로드
document.addEventListener('DOMContentLoaded', function() {
  loadMemoryPalace();
  
  // PDF 내보내기 버튼만 이벤트 리스너 등록
  // HTML 내보내기 버튼은 더 이상 존재하지 않으므로 제거
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportAsPDF);
  }
  
  // 툴팁 설정
  setupTooltip();
  
  // 화면 크기 변경 시 아이템 재배치 - 즉시 반영
  window.addEventListener('resize', function() {
    // 현재 방 화면인 경우에만 재배치
    if (document.querySelector('.rectangular-items-container')) {
      // 현재 아이템을 화면 크기에 맞게 즉시 재배치
      const positions = definePositions();
      
      // 아이템 위치 재조정
      document.querySelectorAll('.memory-item').forEach((itemElement, index) => {
        if (index < positions.length) {
          // 화면 내에 표시되는 아이템만 위치 업데이트
          const position = positions[index];
          
          // 위치 조정 (화면 밖으로 벗어나지 않도록)
          if (position.side === 'right') {
            // 오른쪽 아이템: 아이템이 화면 안에 들어오도록 x 좌표 조정
            const rightAdjust = Math.min(position.x, window.innerWidth - 110);
            itemElement.style.left = rightAdjust + 'px';
            itemElement.style.top = position.y + 'px';
          } else if (position.side === 'bottom') {
            // 하단 아이템: 아이템이 화면 안에 들어오도록 y 좌표 조정
            const bottomAdjust = Math.min(position.y, window.innerHeight - 110);
            itemElement.style.left = position.x + 'px';
            itemElement.style.top = bottomAdjust + 'px';
          } else {
            // 기타 위치의 아이템은 원래 좌표 사용
            itemElement.style.left = position.x + 'px';
            itemElement.style.top = position.y + 'px';
          }
          
          itemElement.style.display = 'block';
        } else {
          // 나머지는 숨김 처리
          itemElement.style.display = 'none';
        }
      });
    }
  });
});

// URL과 그룹을 저장할 변수
let urlRooms = [];
let currentGroup = null;

// 메모리 팰리스 데이터 로드 및 렌더링
function loadMemoryPalace() {
  chrome.runtime.sendMessage({ action: 'getItems' }, function(memoryPalace) {
    if (memoryPalace && Object.keys(memoryPalace.groups).length > 0) {
      renderUrlRooms(memoryPalace);
    } else {
      const container = document.getElementById('memoryPalace');
      container.innerHTML = '<div class="empty-state">There is no memory yet. Build your own memory palace by drag text.</div>';
    }
  });
}

// URL 방 목록 렌더링 - 버튼 표시 제거
function renderUrlRooms(memoryPalace) {
  const container = document.getElementById('memoryPalace');
  container.innerHTML = '<h2 class="room-title">Memory Palace</h2>';
  
  // URL과 그룹 정보 추출
  urlRooms = [];
  
  // 그룹의 URL 기준으로 방 생성
  Object.entries(memoryPalace.groups).forEach(([urlKey, group]) => {
    // URL 정보 추출
    try {
      const baseUrl = new URL(group.url).hostname;
      
      // 중복 방 방지 (같은 URL은 같은 방으로 취급)
      if (!urlRooms.some(room => room.urlKey === urlKey)) {
        // 방에 타임스탬프 추가 (그룹의 마지막 업데이트 시간 또는 생성 시간)
        // 각 아이템의 타임스탬프 중 가장 큰 값을 사용하여 최신 활동 시간 결정
        let latestTimestamp = group.lastUpdate || memoryPalace.lastUpdate || Date.now();
        
        // 아이템들 중 가장 최신 타임스탬프 찾기
        if (group.items && group.items.length > 0) {
          group.items.forEach(item => {
            if (item.timestamp && item.timestamp > latestTimestamp) {
              latestTimestamp = item.timestamp;
            }
          });
        }
        
        urlRooms.push({
          baseUrl: baseUrl,
          url: group.url,
          urlKey: urlKey,
          timestamp: latestTimestamp,
          customTitle: group.customTitle || '' // 사용자 지정 제목 추가
        });
      }
    } catch (e) {
      // URL 파싱 오류 무시
      console.error('URL 파싱 오류:', e);
    }
  });
  
  // 타임스탬프 기준으로 정렬 (최신순)
  urlRooms.sort((a, b) => b.timestamp - a.timestamp);
  
  // 정렬 후 방 번호 재할당 (최신이 1번)
  urlRooms.forEach((room, index) => {
    room.roomNumber = index + 1;
  });

  // 콘솔에 정렬된 방 정보 출력 (디버깅용)
  console.log("정렬된 방 정보:", urlRooms.map(r => ({ 
    roomNumber: r.roomNumber, 
    urlKey: r.urlKey, 
    timestamp: r.timestamp,
    readableTime: new Date(r.timestamp).toLocaleString()
  })));
  
  // 방 목록 생성
  const roomsContainer = document.createElement('div');
  roomsContainer.className = 'search-terms-container';
  
  urlRooms.forEach((room) => {
    const roomElement = document.createElement('div');
    roomElement.className = 'search-term-item';
    
    // 사용자 지정 제목 가져오기 (방 목록 화면에서는 표시만 하고 편집은 불가능)
    const customTitle = room.customTitle || '';
    
    roomElement.innerHTML = `
      <div class="term-text">Room(${room.roomNumber})</div>
      <div class="custom-title-display">${customTitle}</div>
      <div class="term-info">${countRoomItems(memoryPalace, room)}</div>
    `;
    
    // 클릭 이벤트 - 해당 URL 방 표시
    roomElement.addEventListener('click', () => {
      renderUrlRoom(memoryPalace, room);
    });
    
    roomsContainer.appendChild(roomElement);
  });
  
  container.appendChild(roomsContainer);
  
  // 중요: 메인 화면에서는 버튼 숨기기
  const buttonsContainer = document.querySelector('.center-buttons');
  if (buttonsContainer) {
    buttonsContainer.style.display = 'none';
  }
}

// URL 방 아이템 개수 세기
function countRoomItems(memoryPalace, room) {
  let count = 0;
  
  // URL 방 자체의 아이템
  const urlGroup = memoryPalace.groups[room.urlKey];
  if (urlGroup && urlGroup.items) {
    count += urlGroup.items.length;
  }
  
  return count;
}

// 사용자 지정 제목 저장 함수
function saveCustomTitle(roomKey, customTitle) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['memoryPalace'], function(result) {
      const memoryPalace = result.memoryPalace || { items: [], groups: {}, lastUpdate: Date.now() };
      
      // 해당 방의 그룹에 사용자 지정 제목 저장
      if (memoryPalace.groups[roomKey]) {
        memoryPalace.groups[roomKey].customTitle = customTitle;
        
        // 메모리 팰리스 업데이트
        chrome.storage.local.set({ memoryPalace }, function() {
          console.log('사용자 지정 제목 저장 완료:', roomKey, customTitle);
          
          // 현재 표시된 방 목록의 제목도 업데이트 (DOM 업데이트)
          const roomItem = urlRooms.find(room => room.urlKey === roomKey);
          if (roomItem) {
            roomItem.customTitle = customTitle;
          }
          
          resolve(true);
        });
      } else {
        reject('방을 찾을 수 없습니다');
      }
    });
  });
}

// URL 방 렌더링
function renderUrlRoom(memoryPalace, room) {
  const container = document.getElementById('memoryPalace');
  container.innerHTML = '';
  
  // 방 제목 중앙에 배치
  const roomTitle = document.createElement('div');
  roomTitle.className = 'room-title-center';
  
  // 사용자 지정 제목 가져오기
  const customTitle = memoryPalace.groups[room.urlKey]?.customTitle || '';
  
  roomTitle.innerHTML = `
    <h2>Room(${room.roomNumber})</h2>
    <div class="room-custom-title" contenteditable="true" data-room-key="${room.urlKey}" placeholder="Label">${customTitle}</div>
  `;
  container.appendChild(roomTitle);
  
  // 사용자 지정 제목 이벤트 설정
  const customTitleElement = roomTitle.querySelector('.room-custom-title');
  customTitleElement.addEventListener('blur', function() {
    const newTitle = this.textContent.trim();
    const roomKey = this.getAttribute('data-room-key');
    
    // 사용자 지정 제목 저장
    saveCustomTitle(roomKey, newTitle)
      .then(() => {
        console.log('제목 저장 성공');
      })
      .catch(err => {
        console.error('제목 저장 실패:', err);
      });
  });
  
  // Enter 키 누를 때 편집 완료
  customTitleElement.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.blur(); // 포커스 제거하여 blur 이벤트 발생
    }
  });
  
  // 아이템 컨테이너 - 사각형 배치를 위한 컨테이너
  const roomItems = document.createElement('div');
  roomItems.className = 'rectangular-items-container';
  roomItems.id = 'roomItemsContainer';
  
  // 해당 URL 방의 아이템들
  const urlGroup = memoryPalace.groups[room.urlKey];
  const itemsToRender = [];
  
  if (urlGroup && urlGroup.items) {
    urlGroup.items.forEach(item => {
      itemsToRender.push({
        item: item,
        group: urlGroup
      });
    });
  }
  
  // 아이템이 없을 경우
  if (itemsToRender.length === 0) {
    roomItems.innerHTML = '<div class="empty-room">No items found in this room yet.</div>';
  } else {
    // 위치 정의 - 정확한 위치에 배치
    const positions = definePositions();
    
    // 현재 화면에 맞게 표시할 아이템 수 제한 (최대 32개)
    const limitedItems = itemsToRender.slice(0, Math.min(positions.length, 32));
    
    // 아이템 배치 - 정의된 위치에 따라
    limitedItems.forEach((itemData, index) => {
      const item = itemData.item;
      const group = itemData.group;
      
      // 인덱스가 위치 배열 범위를 벗어나면 첫 위치 사용
      const posIndex = index < positions.length ? index : index % positions.length;
      const position = positions[posIndex];
      
      const itemElement = document.createElement('div');
      itemElement.className = `memory-item ${item.type}`;
      itemElement.dataset.url = item.url;
      itemElement.dataset.timestamp = item.timestamp;
      
      // 위치 스타일 지정 - 화면 밖으로 벗어나지 않도록 위치 조정
      itemElement.style.position = 'absolute';
      
      // 위치 조정 (화면 밖으로 벗어나지 않도록)
      if (position.side === 'right') {
        // 오른쪽 아이템: 아이템이 화면 안에 들어오도록 x 좌표 조정
        const rightAdjust = Math.min(position.x, window.innerWidth - 110);
        itemElement.style.left = rightAdjust + 'px';
        itemElement.style.top = position.y + 'px';
      } else if (position.side === 'bottom') {
        // 하단 아이템: 아이템이 화면 안에 들어오도록 y 좌표 조정
        const bottomAdjust = Math.min(position.y, window.innerHeight - 110);
        itemElement.style.left = position.x + 'px';
        itemElement.style.top = bottomAdjust + 'px';
      } else {
        // 기타 위치의 아이템은 원래 좌표 사용
        itemElement.style.left = position.x + 'px';
        itemElement.style.top = position.y + 'px';
      }
      
      // 항목 번호와 내용 추가 (항목 번호는 01~32 형식)
      const itemNumber = (index + 1).toString().padStart(2, '0');
      
      if (item.type === 'text') {
        itemElement.innerHTML = `
          <div class="item-number">(${itemNumber})<br></div>
          <div class="item-content">${item.content}</div>
        `;
      } else if (item.type === 'image') {
        itemElement.innerHTML = `
          <div class="item-number">(${itemNumber})<br></div>
          <img src="${item.content}" alt="Collected image" class="item-image">
        `;
      }
      
      // 클릭 이벤트 - 원본 페이지로 이동
      itemElement.addEventListener('click', function() {
        openSourcePage(item.url, item.scrollPosition);
      });
      
      roomItems.appendChild(itemElement);
    });
    
    // 아이템 수가 32개 초과일 때 경고 표시
    if (itemsToRender.length > 30) {
      const warningElement = document.createElement('div');
      warningElement.className = 'memory-warning';
      warningElement.textContent = 'This room is full. Maximum 30 contents can be memorized.';
      roomItems.appendChild(warningElement);
    }
  }
  
  container.appendChild(roomItems);
  
  // 버튼 컨테이너 - 중앙 하단에 배치
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'center-buttons';
  
  // 뒤로가기 버튼
  const backButton = document.createElement('button');
  backButton.textContent = '← Back';
  backButton.className = 'back-button';
  backButton.addEventListener('click', () => {
    // 방 목록 화면으로 돌아갈 때 반드시 최신 데이터로 다시 로드
    loadMemoryPalace();
  });
  
  // PDF 내보내기 버튼
  const exportPdfButton = document.createElement('button');
  exportPdfButton.textContent = 'Export PDF';
  exportPdfButton.id = 'exportPdfBtn';
  exportPdfButton.className = 'export-button';
  exportPdfButton.addEventListener('click', exportAsPDF);
  
  // 버튼 추가
  buttonsContainer.appendChild(backButton);
  buttonsContainer.appendChild(exportPdfButton);
  container.appendChild(buttonsContainer);
  
  // 버튼 컨테이너를 표시 - 여기서 명시적으로 표시
  buttonsContainer.style.display = 'flex';
}



// 고정 위치 정의 함수 - 화면 크기에 따라 조정 (가로와 세로를 독립적으로 처리)
function definePositions() {
  // 화면 크기 가져오기
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // 여백 - 화면 크기에 관계없이 일정하게
  const margin = 20;
  
  // 일반적인 아이템 크기 (화면 벗어남 방지용)
  const itemWidth = 100;
  const itemHeight = 100;
  
  const positions = [];
  
  // 화면 너비에 따른 가로 아이템 수 계산
  let topItems, bottomItems;
  
  if (width <= 320) {
    topItems = 1;
    bottomItems = 0;
  } else if (width <= 480) {
    topItems = 2;
    bottomItems = 2;
  } else if (width <= 768) {
    topItems = 4;
    bottomItems = 4;
  } else if (width <= 1024) {
    topItems = 6;
    bottomItems = 6;
  } else if (width <= 1366) {
    topItems = 8;
    bottomItems = 8;
  } else {
    topItems = 10;
    bottomItems = 10;
  }
  
  // 화면 높이에 따른 세로 아이템 수 계산
  let rightItems, leftItems;
  
  if (height <= 400) {
    rightItems = 1;
    leftItems = 1;
  } else if (height <= 500) {
    rightItems = 2;
    leftItems = 2;
  } else if (height <= 600) {
    rightItems = 3;
    leftItems = 3;
  } else if (height <= 800) {
    rightItems = 4;
    leftItems = 4;
  } else if (height <= 1000) {
    rightItems = 5;
    leftItems = 5;
  } else {
    rightItems = 7;
    leftItems = 7;
  }
  
  // 상단 항목 위치 (가로 길이 기준)
  if (topItems > 0) {
    const spacing = (width - 2 * margin - itemWidth) / (topItems - 1);
    for (let i = 0; i < topItems; i++) {
      positions.push({
        x: margin + i * spacing,
        y: margin,
        side: 'top'
      });
    }
  }
  
  // 우측 항목 위치 (세로 길이 기준)
  if (rightItems > 0) {
    const spacing = (height - 2 * margin - itemHeight) / (rightItems + 1);
    for (let i = 0; i < rightItems; i++) {
      positions.push({
        // 우측 아이템은 화면 넓이에서 아이템 넓이를 뺀 값을 x로 설정 (화면 밖으로 나가지 않도록)
        x: width - margin - itemWidth,
        y: margin + (i + 1) * spacing,
        side: 'right'
      });
    }
  }
  
  // 하단 항목 위치 (우측에서 좌측으로) - 가로 길이 기준
  if (bottomItems > 0) {
    const spacing = (width - 2 * margin - itemWidth) / (bottomItems - 1);
    for (let i = 0; i < bottomItems; i++) {
      positions.push({
        x: width - margin - itemWidth - i * spacing,
        // 하단 아이템은 화면 높이에서 아이템 높이를 뺀 값을 y로 설정 (화면 밖으로 나가지 않도록)
        y: height - margin - itemHeight,
        side: 'bottom'
      });
    }
  }
  
  // 좌측 항목 위치 (하단에서 상단으로) - 세로 길이 기준
  if (leftItems > 0) {
    const spacing = (height - 2 * margin - itemHeight) / (leftItems + 1);
    for (let i = 0; i < leftItems; i++) {
      positions.push({
        x: margin,
        y: height - margin - itemHeight - (i + 1) * spacing,
        side: 'left'
      });
    }
  }
  
  return positions;
}

// 원본 페이지 열기
function openSourcePage(url, scrollPosition) {
  chrome.tabs.create({ url }, function(tab) {
    // 페이지 로드 완료 후 스크롤 포지션으로 이동
    if (scrollPosition) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: function(scrollPos) {
          window.scrollTo(0, scrollPos);
        },
        args: [scrollPosition]
      });
    }
  });
}

// 텍스트 자르기 유틸리티
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

// 툴팁 설정
function setupTooltip() {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;
  
  const tooltipText = document.getElementById('tooltipText');
  const tooltipUrl = document.getElementById('tooltipUrl');
  
  // 마우스 오버 시 툴팁 표시
  document.addEventListener('mouseover', function(e) {
    if (e.target.closest('.memory-item')) {
      const item = e.target.closest('.memory-item');
      const url = item.dataset.url;
      const timestamp = new Date(parseInt(item.dataset.timestamp));
      
      // 툴팁 내용 설정
      tooltipText.textContent = `Collected on ${timestamp.toLocaleString()}`;
      tooltipUrl.textContent = url;
      
      // 툴팁 위치 조정
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // 화면 우측 경계를 넘지 않도록 조정
      let leftPos = e.pageX + 15;
      if (leftPos + 300 > viewportWidth) {
        leftPos = viewportWidth - 310;
      }
      
      tooltip.style.left = `${leftPos}px`;
      tooltip.style.top = `${e.pageY + 15}px`;
      tooltip.style.display = 'block';
    }
  });
  
  // 마우스 아웃 시 툴팁 숨김
  document.addEventListener('mouseout', function(e) {
    if (e.target.closest('.memory-item')) {
      tooltip.style.display = 'none';
    }
  });
}

// PDF로 내보내기 함수 - 최종 개선 버전
function exportAsPDF() {
  // body에 내보내기 모드 클래스 추가/제거
  const bodyElement = document.body;
  const isExportMode = bodyElement.classList.contains('export-mode');
  
  // 현재 화면의 모든 메모리 아이템과 컨테이너 찾기
  const memoryItems = document.querySelectorAll('.memory-item');
  const roomContainer = document.getElementById('roomItemsContainer');
  const roomTitleCenter = document.querySelector('.room-title-center');
  
  if (isExportMode) {
    // 내보내기 모드에서 일반 모드로 돌아가기
    bodyElement.classList.remove('export-mode');
    
    // 아이템에서 블러 제거 클래스 삭제
    memoryItems.forEach(item => {
      item.classList.remove('blur-removed');
    });
    
    // 안내 메시지 제거
    const message = document.querySelector('.export-message');
    if (message) {
      message.remove();
    }
    
    // Export 버튼 텍스트 복원
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
      exportBtn.textContent = 'Export PDF';
    }
    
    // Back 버튼 표시 복원
    const backButton = document.querySelector('.back-button');
    if (backButton) {
      backButton.style.display = '';
    }
    
    console.log('일반 모드로 복원됨');
  } else {
    // 일반 모드에서 내보내기 모드로 전환
    bodyElement.classList.add('export-mode');
    
    // 아이템에 블러 제거 클래스 추가
    memoryItems.forEach(item => {
      item.classList.add('blur-removed');
    });
    
    // Back 버튼 숨기기
    const backButton = document.querySelector('.back-button');
    if (backButton) {
      backButton.style.display = 'none';
    }
    
    // 방 제목 중앙 정렬 강화 - 명시적인 스타일 적용
    if (roomTitleCenter) {
      // 기존 스타일 유지하면서 추가 스타일 적용
      const currentPosition = window.getComputedStyle(roomTitleCenter).position;
      const currentZIndex = window.getComputedStyle(roomTitleCenter).zIndex;
      
      roomTitleCenter.style.position = 'absolute';
      roomTitleCenter.style.top = '50%';
      roomTitleCenter.style.left = '50%';
      roomTitleCenter.style.transform = 'translate(-50%, -50%)';
      roomTitleCenter.style.zIndex = '100';
      roomTitleCenter.style.textAlign = 'center';
      roomTitleCenter.style.width = 'auto';
      roomTitleCenter.style.margin = '0 auto';
      
      console.log('방 제목 스타일 적용됨', {
        이전_position: currentPosition,
        이전_zIndex: currentZIndex,
        새_position: roomTitleCenter.style.position,
        새_zIndex: roomTitleCenter.style.zIndex
      });
    } else {
      console.warn('방 제목 요소를 찾을 수 없음');
    }
    
    // 안내 메시지 표시
    const message = document.createElement('div');
    message.className = 'export-message';
    message.innerHTML = '<strong>블러 효과가 제거되었습니다</strong><br>브라우저 인쇄(Ctrl+P)로 PDF 저장 후 다시 버튼을 클릭하세요.';
    document.body.appendChild(message);
    
    // Export 버튼 텍스트 변경
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
      exportBtn.textContent = 'Restore View';
    }
    
    console.log('내보내기 모드로 전환됨');
  }
}