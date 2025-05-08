// 글로벌 상태 변수
let chairStatus = {
    chair1: 'empty', // 'empty', 'user', 'partner'
    chair2: 'empty'  // 'empty', 'user', 'partner'
};

// Event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to the chair elements
    const chair1 = document.getElementById('chair1');
    const chair2 = document.getElementById('chair2');
    
    // 기본 화면에서 의자 클릭 핸들러
    function selectChair(chairElement, chairId) {
        // 이미 선택된 의자는 무시
        if (chairStatus[chairId] !== 'empty') {
            return;
        }
        
        // 현재 의자 선택
        chairStatus[chairId] = 'user';
        chairElement.classList.add('occupied');
        
        // 다른 의자 번호 확인
        const otherChairId = chairId === 'chair1' ? 'chair2' : 'chair1';
        const otherChair = chairId === 'chair1' ? chair2 : chair1;
        
        // 대기 메시지 표시 - 의자 컨테이너에 추가하도록 수정
        showWaitingMessage(chairElement);
        
        // 현실에서는 여기서 서버에 사용자가 의자를 선택했다고 알림
        // 여기서는 데모를 위해 랜덤하게 파트너 등장 시뮬레이션
        
        // 다른 의자 클릭 이벤트 변경 - 이제 파트너 참여로 처리
        otherChair.removeEventListener('click', chair1ClickHandler);
        otherChair.removeEventListener('click', chair2ClickHandler);
        otherChair.addEventListener('click', () => partnerJoin(otherChair, otherChairId));
        
        // 랜덤 파트너 참여 시뮬레이션 (실제로는 서버에서 알림)
        // simulatePartnerJoining(otherChair, otherChairId);
    }
    
    // 대기 메시지 표시 함수 - 의자 컨테이너에 메시지 추가하도록 수정
    function showWaitingMessage(chairElement) {
        // 기존 메시지가 있으면 제거
        removeWaitingMessages();
        
        // 새 메시지 요소 생성
        const waitingMsg = document.createElement('div');
        waitingMsg.className = 'waiting-status';
        waitingMsg.textContent = 'Waiting for your partner to join...';
        
        // 의자 컨테이너에 메시지 추가 (의자가 아닌)
        const chairsContainer = document.querySelector('.chairs-container');
        chairsContainer.appendChild(waitingMsg);
    }
    
    // 대기 메시지 제거 함수
    function removeWaitingMessages() {
        const existingMessages = document.querySelectorAll('.waiting-status');
        existingMessages.forEach(msg => msg.remove());
    }
    
    // 파트너 참여 함수
    function partnerJoin(chairElement, chairId) {
        // 의자 상태 업데이트
        chairStatus[chairId] = 'partner';
        chairElement.classList.add('occupied');
        
        // 대기 메시지 제거
        removeWaitingMessages();
        
        // 채팅 시작 메시지 - 의자 컨테이너의 중앙에 위치시킴
        const startChatMsg = document.createElement('div');
        startChatMsg.className = 'start-chat-message';
        startChatMsg.textContent = 'Starting conversation...';
        
        // 메시지를 의자 컨테이너에 추가
        const chairsContainer = document.querySelector('.chairs-container');
        chairsContainer.appendChild(startChatMsg);
        
        // 채팅 화면으로 전환 - 짧은 딜레이 후 chat.html로 이동
        setTimeout(() => {
            // 채팅 주제 랜덤 생성 (실제로는 서버에서 제공)
            const topics = [
                "When do you feel truly close to someone?",
                "What's a memory that changed how you see the world?",
                "What do you think makes a meaningful life?",
                "How do you handle disappointment?",
                "What gives you hope when things feel uncertain?"
            ];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            
            // localStorage에 주제 저장 (페이지 간 데이터 전달)
            localStorage.setItem('chatTopic', randomTopic);
            
            // 채팅 페이지로 이동
            window.location.href = 'chat.html';
        }, 1500);
    }
    
    // 자동 파트너 참여 시뮬레이션 (데모용)
    function simulatePartnerJoining(chairElement, chairId) {
        const randomDelay = Math.floor(Math.random() * 5000) + 2000; // 2-7초 사이
        setTimeout(() => {
            partnerJoin(chairElement, chairId);
        }, randomDelay);
    }
    
    // 의자별 클릭 핸들러 (클릭 이벤트 제거를 위해 참조 저장)
    function chair1ClickHandler() {
        selectChair(chair1, 'chair1');
    }
    
    function chair2ClickHandler() {
        selectChair(chair2, 'chair2');
    }
    
    // 의자에 클릭 이벤트 리스너 추가
    chair1.addEventListener('click', chair1ClickHandler);
    chair2.addEventListener('click', chair2ClickHandler);
    
    // 이미지 오류 처리
    const chairImages = document.querySelectorAll('.chair-img');
    chairImages.forEach(function(img) {
        img.addEventListener('error', function() {
            console.error('Failed to load chair image: ' + img.src);
        });
    });
    
    // 의자 하이라이트 애니메이션
    function animateChairs() {
        const chairs = document.querySelectorAll('.chair:not(.occupied)');
        chairs.forEach(function(chair, index) {
            setTimeout(function() {
                chair.classList.add('highlight');
                setTimeout(function() {
                    chair.classList.remove('highlight');
                }, 500);
            }, index * 500);
        });
    }
    
    // 페이지 로드 후 애니메이션 시작
    setTimeout(animateChairs, 1000);
});