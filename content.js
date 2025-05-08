// 토스트 알림 표시
function showToast(message, type = 'info') {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.mpc-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.className = `mpc-toast mpc-toast-${type}`;
  toast.textContent = message;
  
  // 인라인 스타일 적용
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
  toast.style.color = 'white';
  toast.style.padding = '12px 16px';
  toast.style.borderRadius = '4px';
  toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.zIndex = '999999';
  toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(10px)';
  toast.style.transition = 'opacity 0.3s, transform 0.3s';
  
  document.body.appendChild(toast);
  
  // 애니메이션 효과
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  // 자동 제거
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 텍스트 선택 이벤트 리스너
document.addEventListener('mouseup', function(event) {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    // 선택된 텍스트가 있으면 처리
    const selectionInfo = {
      type: 'text',
      content: selectedText,
      url: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now(),
      position: {
        x: event.pageX,
        y: event.pageY
      },
      scrollPosition: window.scrollY
    };
    
    // 백그라운드 스크립트로 데이터 전송
    chrome.runtime.sendMessage({
      action: 'addItem',
      item: selectionInfo
    }, function(response) {
      // 응답 처리를 위한 에러 체크
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        return;
      }
      
      // 알림 표시
      if (response && response.success) {
        showToast('The text has been remembered.', 'success');
      }
    });
  }
});

// 이미지 클릭 이벤트 리스너
document.addEventListener('click', function(event) {
  if (event.target.tagName.toLowerCase() === 'img') {
    console.log('이미지 클릭 감지:', event.target.src);
    
    // 이미지가 클릭되면 처리
    const imageInfo = {
      type: 'image',
      content: event.target.src,
      url: window.location.href,
      pageTitle: document.title,
      timestamp: Date.now(),
      position: {
        x: event.pageX,
        y: event.pageY
      },
      scrollPosition: window.scrollY
    };
    
    // 이미지 선택 효과 추가
    event.target.style.outline = '3px solid rgba(66, 133, 244, 0.8)';
    event.target.style.transition = 'outline 0.2s ease';
    
    // 백그라운드 스크립트로 데이터 전송
    chrome.runtime.sendMessage({
      action: 'addItem',
      item: imageInfo
    }, function(response) {
      // 응답 처리를 위한 에러 체크
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        event.target.style.outline = 'none';
        return;
      }
      
      // 알림 표시
      if (response && response.success) {
        showToast('The image has been remembered.', 'success');
        
        // 잠시 후 선택 효과 제거
        setTimeout(() => {
          event.target.style.outline = 'none';
        }, 1000);
      } else {
        event.target.style.outline = 'none';
      }
    });
    
    // 이벤트 기본 동작 방지 (이미지 열기 방지)
    event.preventDefault();
  }
});

// 선택 하이라이트 스타일 추가
try {
  const style = document.createElement('style');
  style.textContent = `
    ::selection {
      background: rgba(0, 123, 255, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
  console.log('Memory Palace Collector: 선택 스타일 적용됨');
} catch (e) {
  console.error('Memory Palace Collector: 스타일 적용 실패', e);
}

// 콘솔 메시지
console.log('Memory Palace Collector: 컨텐츠 스크립트 로드됨');

// 백그라운드로부터 받은 메시지 처리
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'itemSaved' && request.success) {
    showToast('Item saved to your Memory Palace.', 'success');
  }
});