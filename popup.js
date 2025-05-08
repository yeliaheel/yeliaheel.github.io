// 페이지 로드 시 통계 업데이트
document.addEventListener('DOMContentLoaded', function() {
  updateStats();
  
  // 버튼 이벤트 리스너 등록
  document.getElementById('viewBtn').addEventListener('click', openMemoryPalace);
  document.getElementById('clearBtn').addEventListener('click', clearMemoryPalace);
  
  // 마이그레이션 버튼 추가 (필요한 경우)
  const migrateBtn = document.getElementById('migrateBtn');
  if (migrateBtn) {
    migrateBtn.addEventListener('click', migrateData);
  }
});

// 메모리 팰리스 통계 업데이트
function updateStats() {
  chrome.runtime.sendMessage({ action: 'getItems' }, function(memoryPalace) {
    if (memoryPalace) {
      let textCount = 0;
      let imageCount = 0;
      
      // 모든 그룹 순회
      Object.values(memoryPalace.groups).forEach(group => {
        group.items.forEach(item => {
          if (item.type === 'text') textCount++;
          else if (item.type === 'image') imageCount++;
        });
      });
      
      // 통계 표시
      document.getElementById('textCount').textContent = textCount;
      document.getElementById('imageCount').textContent = imageCount;
      document.getElementById('groupCount').textContent = Object.keys(memoryPalace.groups).length;
    }
  });
}

// 메모리 팰리스 페이지 열기
function openMemoryPalace() {
  chrome.tabs.create({ url: 'viewer.html' });
}

// 메모리 팰리스 초기화
function clearMemoryPalace() {
  if (confirm('Do you want to erase all of the memories?')) {
    chrome.storage.local.set({
      memoryPalace: {
        items: [],
        groups: {}
      }
    }, function() {
      updateStats();
      alert('You lost all the memories you have.');
    });
  }
}

// 데이터 마이그레이션 (방 순서 재정렬)
function migrateData() {
  if (confirm('This will reorganize your rooms by last activity time. Continue?')) {
    chrome.storage.local.get(['memoryPalace'], function(result) {
      if (!result.memoryPalace) {
        alert('No Memory Palace data found.');
        return;
      }
      
      console.log('Starting migration: existing data', result.memoryPalace);
      
      const memoryPalace = result.memoryPalace;
      const currentTime = Date.now();
      let counter = 1;
      
      // 새로운 그룹 객체 생성 (순서를 강제로 지정하기 위함)
      const newGroups = {};
      
      // 모든 그룹 정보 수집 및 최신 항목 타임스탬프 확인
      const groupsInfo = [];
      
      Object.entries(memoryPalace.groups).forEach(([urlKey, group]) => {
        let latestTimestamp = 0;
        
        // 그룹 내 모든 아이템의 타임스탬프 확인
        if (group.items && group.items.length > 0) {
          group.items.forEach(item => {
            // 타임스탬프가 없는 항목에 현재 시간 부여 (약간의 차이를 두어 순서 보장)
            if (!item.timestamp) {
              item.timestamp = currentTime - (counter * 1000); // 1초 간격으로 차이
              counter++;
            }
            
            latestTimestamp = Math.max(latestTimestamp, item.timestamp);
          });
        }
        
        // 그룹에 타임스탬프 정보 추가/업데이트
        group.createdAt = group.createdAt || (currentTime - (counter * 10000)); // 생성 시간 (없으면 생성)
        group.lastUpdate = latestTimestamp > 0 ? latestTimestamp : (currentTime - (counter * 10000)); // 마지막 업데이트 시간
        
        // 그룹 정보 저장 (정렬용)
        groupsInfo.push({
          urlKey: urlKey,
          group: group,
          lastUpdate: group.lastUpdate
        });
        
        counter++;
      });
      
      // 타임스탬프 기준으로 그룹 정렬 (내림차순 - 최신이 먼저)
      groupsInfo.sort((a, b) => b.lastUpdate - a.lastUpdate);
      
      // 정렬된 순서대로 새 그룹 객체에 추가
      groupsInfo.forEach(info => {
        newGroups[info.urlKey] = info.group;
      });
      
      // 업데이트된 메모리 팰리스 객체
      const updatedMemoryPalace = {
        items: memoryPalace.items,
        groups: newGroups,
        lastUpdate: currentTime
      };
      
      // 저장
      chrome.storage.local.set({ memoryPalace: updatedMemoryPalace }, function() {
        console.log('Memory Palace data migration complete:', updatedMemoryPalace);
        updateStats();
        alert('Data migration completed. Your rooms are now organized by recent activity.');
      });
    });
  }
}