// TopView.js - 위에서 보기 모드를 위한 함수들

class TopViewRenderer {
    constructor(scene, camera, controls) {
      this.scene = scene;
      this.camera = camera;
      this.controls = controls;
      this.isTopView = false;
      this.items = [];
      this.originalCameraPosition = { x: 0, y: 0, z: 0 };
      this.DOME_RADIUS = 500;
    }
    
    // 위에서 보기 모드 토글
    toggle() {
      this.isTopView = !this.isTopView;
      
      if (this.isTopView) {
        // 현재 카메라 위치 저장
        this.originalCameraPosition = {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z
        };
        
        // 위에서 보는 뷰로 변경
        this.camera.position.set(0, this.DOME_RADIUS * 1.5, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.enabled = false;
        
        // 아이템 재배치 (가장자리로)
        this.rearrangeItems();
      } else {
        // 다시 원래 뷰로 변경
        this.camera.position.set(
          this.originalCameraPosition.x,
          this.originalCameraPosition.y,
          this.originalCameraPosition.z
        );
        this.controls.enabled = true;
        
        // 아이템을 원래 위치로
        this.resetItemsPosition();
      }
      
      return this.isTopView;
    }
    
    // 위에서 보기 모드에서 아이템 재배치
    rearrangeItems() {
      // 현재 표시된 모든 아이템 가져오기
      this.items = [];
      this.scene.traverse(child => {
        if (child.userData && 
            (child.userData.type === 'keyword' || 
             child.userData.type === 'text' || 
             child.userData.type === 'image')) {
          this.items.push(child);
        }
      });
      
      // 아이템 개수
      const itemCount = this.items.length;
      if (itemCount === 0) return;
      
      // 원형으로 배치
      this.items.forEach((item, index) => {
        // 원래 위치 저장
        if (!item.userData.originalPosition) {
          item.userData.originalPosition = {
            x: item.position.x,
            y: item.position.y,
            z: item.position.z
          };
        }
        
        // 원형 배치 계산
        const angle = (index / itemCount) * Math.PI * 2;
        const radius = this.DOME_RADIUS * 0.7;
        
        // 애니메이션 효과를 위한 TWEEN 사용
        this.animateItemPosition(item, {
          x: Math.cos(angle) * radius,
          y: 0,  // 모두 같은 높이에 배치
          z: Math.sin(angle) * radius
        });
        
        // 항상 위를 향하도록 회전
        item.rotation.x = -Math.PI / 2;
      });
    }
    
    // 위치 애니메이션
    animateItemPosition(item, targetPosition) {
      const duration = 1000; // 1초
      const startPosition = {
        x: item.position.x,
        y: item.position.y,
        z: item.position.z
      };
      
      const startTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 이징 함수 (부드러운 효과)
        const easeProgress = this.easeOutQuad(progress);
        
        // 위치 보간
        item.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easeProgress;
        item.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easeProgress;
        item.position.z = startPosition.z + (targetPosition.z - startPosition.z) * easeProgress;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
    
    // 원래 위치로 복귀
    resetItemsPosition() {
      this.items.forEach(item => {
        if (item.userData.originalPosition) {
          this.animateItemPosition(item, item.userData.originalPosition);
          
          // 원래 회전 상태로 복귀
          item.lookAt(0, 0, 0);
        }
      });
    }
    
    // 이징 함수 (부드러운 효과)
    easeOutQuad(t) {
      return t * (2 - t);
    }
  }
  
  // 돔 공간에서의 VR 스타일 네비게이션
  class DomeNavigation {
    constructor(camera, domElement, radius = 500) {
      this.camera = camera;
      this.domElement = domElement;
      this.radius = radius;
      this.isNavigating = false;
      this.lastMousePosition = { x: 0, y: 0 };
      
      this.setupEventListeners();
    }
    
    setupEventListeners() {
      // 마우스 이벤트 핸들러
      this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
      
      // 터치 이벤트 핸들러 (모바일 지원)
      this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
      this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
      this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
    
    onMouseDown(event) {
      this.isNavigating = true;
      this.lastMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
      this.domElement.style.cursor = 'grabbing';
    }
    
    onMouseMove(event) {
      if (!this.isNavigating) return;
      
      const deltaX = event.clientX - this.lastMousePosition.x;
      const deltaY = event.clientY - this.lastMousePosition.y;
      
      this.rotateCamera(deltaX, deltaY);
      
      this.lastMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    }
    
    onMouseUp() {
      this.isNavigating = false;
      this.domElement.style.cursor = 'grab';
    }
    
    onTouchStart(event) {
      if (event.touches.length === 1) {
        this.isNavigating = true;
        this.lastMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }
    }
    
    onTouchMove(event) {
      if (!this.isNavigating || event.touches.length !== 1) return;
      
      const deltaX = event.touches[0].clientX - this.lastMousePosition.x;
      const deltaY = event.touches[0].clientY - this.lastMousePosition.y;
      
      this.rotateCamera(deltaX, deltaY);
      
      this.lastMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      
      // 페이지 스크롤 방지
      event.preventDefault();
    }
    
    onTouchEnd() {
      this.isNavigating = false;
    }
    
    rotateCamera(deltaX, deltaY) {
      // 카메라 회전 계산 (수평, 수직)
      const horizontalRotation = (deltaX / this.domElement.clientWidth) * Math.PI;
      const verticalRotation = (deltaY / this.domElement.clientHeight) * Math.PI;
      
      // 카메라 회전 적용
      this.camera.rotation.y -= horizontalRotation * 2;
      
      // 수직 회전은 제한 (-PI/2 ~ PI/2, 즉 아래나 위로 완전히 뒤집히지 않도록)
      this.camera.rotation.x -= verticalRotation * 2;
      this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));
    }
  }
  
// 전역 객체에 클래스 노출
window.TopViewRenderer = TopViewRenderer;
window.DomeNavigation = DomeNavigation;