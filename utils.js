/**
 * 메모리 팰리스 익스텐션 유틸리티 함수
 */

function createUrlKey(url) {
  // URL 기반 고유 키 생성 (URL 호스트명과 경로 기준)
  try {
    const urlObj = new URL(url);
    
    // 프로토콜, 호스트명, 경로를 조합하여 고유한 키 생성
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (e) {
    return url; // URL 형식이 아니면 원래 값 사용
  }
}

// 랜덤 포지션 생성 (전체 화면에서 랜덤)
function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * 70) + 10, // 10% ~ 80%
    y: Math.floor(Math.random() * 70) + 10  // 10% ~ 80%
  };
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

// 고유 ID 생성
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 중복 방지를 위한 디바운스 함수
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// 날짜 포맷팅 함수
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// 아이템 복제 방지를 위한 해시 생성
function createItemHash(item) {
  if (item.type === 'text') {
    return `text-${item.content.toLowerCase().trim()}-${item.url}`;
  } else if (item.type === 'image') {
    return `image-${item.content}-${item.url}`;
  }
  return null;
}