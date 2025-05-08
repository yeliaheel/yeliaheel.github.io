// 이 코드는 Three.js의 OrbitControls를 비모듈 방식으로 구현한 것입니다
// 크롬 확장 프로그램에서 사용 가능합니다

// 이벤트 정의
THREE.OrbitControls = function(object, domElement) {
	this.object = object;
	this.domElement = domElement !== undefined ? domElement : document;
  
	// API
	this.enabled = true;
	this.target = new THREE.Vector3();
	this.enableZoom = true;
	this.zoomSpeed = 1.0;
	this.minDistance = 0;
	this.maxDistance = Infinity;
	this.enableRotate = true;
	this.rotateSpeed = 1.0;
	this.minPolarAngle = 0; // 라디안
	this.maxPolarAngle = Math.PI; // 라디안
	this.minAzimuthAngle = -Infinity; // 라디안
	this.maxAzimuthAngle = Infinity; // 라디안
	this.enablePan = true;
	this.keyPanSpeed = 7.0;
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 초당 30도 회전
	this.enableDamping = false;
	this.dampingFactor = 0.05;
	this.screenSpacePanning = true;
  
	// 마우스 버튼
	this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  
	// 터치 손가락
	this.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  
	// 내부 변수
	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;
  
	this._domElementKeyEvents = null;
  
	// 상태
	this.STATE = {
	  NONE: -1,
	  ROTATE: 0,
	  DOLLY: 1,
	  PAN: 2,
	  TOUCH_ROTATE: 3,
	  TOUCH_PAN: 4,
	  TOUCH_DOLLY_PAN: 5,
	  TOUCH_DOLLY_ROTATE: 6
	};
	this.state = this.STATE.NONE;
  
	this.EPS = 0.000001;
  
	// 현재 위치를 구형 좌표로 변환
	this.spherical = new THREE.Spherical();
	this.sphericalDelta = new THREE.Spherical();
  
	this.scale = 1;
	this.panOffset = new THREE.Vector3();
	this.zoomChanged = false;
  
	this.rotateStart = new THREE.Vector2();
	this.rotateEnd = new THREE.Vector2();
	this.rotateDelta = new THREE.Vector2();
  
	this.panStart = new THREE.Vector2();
	this.panEnd = new THREE.Vector2();
	this.panDelta = new THREE.Vector2();
  
	this.dollyStart = new THREE.Vector2();
	this.dollyEnd = new THREE.Vector2();
	this.dollyDelta = new THREE.Vector2();
  
	this.pointers = [];
	this.pointerPositions = {};
  
	this.update = function() {
	  var position = this.object.position;
	  var offset = position.clone().sub(this.target);
  
	  // 구면 좌표계로 변환
	  this.spherical.setFromVector3(offset);
  
	  if (this.autoRotate && this.state === this.STATE.NONE) {
		this.rotateLeft(this.getAutoRotationAngle());
	  }
  
	  this.spherical.theta += this.sphericalDelta.theta;
	  this.spherical.phi += this.sphericalDelta.phi;
  
	  // 각도 제한
	  this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
	  this.spherical.makeSafe();
  
	  // 거리 제한
	  this.spherical.radius *= this.scale;
	  this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
  
	  // 타겟 이동
	  this.target.add(this.panOffset);
  
	  // 카메라 위치 업데이트
	  offset.setFromSpherical(this.spherical);
	  position.copy(this.target).add(offset);
	  this.object.lookAt(this.target);
  
	  // 감쇠 적용
	  if (this.enableDamping) {
		this.sphericalDelta.theta *= (1 - this.dampingFactor);
		this.sphericalDelta.phi *= (1 - this.dampingFactor);
		this.panOffset.multiplyScalar(1 - this.dampingFactor);
	  } else {
		this.sphericalDelta.set(0, 0, 0);
		this.panOffset.set(0, 0, 0);
	  }
  
	  this.scale = 1;
  
	  return this.zoomChanged || 
			 this.lastPosition.distanceToSquared(this.object.position) > this.EPS || 
			 8 * (1 - this.lastQuaternion.dot(this.object.quaternion)) > this.EPS;
	};
  
	this.dispose = function() {
	  this.domElement.removeEventListener('contextmenu', this.onContextMenu);
	  this.domElement.removeEventListener('pointerdown', this.onPointerDown);
	  this.domElement.removeEventListener('wheel', this.onMouseWheel);
	  this.domElement.removeEventListener('touchstart', this.onTouchStart);
	  this.domElement.removeEventListener('touchend', this.onTouchEnd);
	  this.domElement.removeEventListener('touchmove', this.onTouchMove);
  
	  this.domElement.removeEventListener('pointermove', this.onPointerMove);
	  this.domElement.removeEventListener('pointerup', this.onPointerUp);
  
	  if (this._domElementKeyEvents !== null) {
		this._domElementKeyEvents.removeEventListener('keydown', this.onKeyDown);
	  }
	};
  
	// 내부 메서드
	var that = this;
	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };
  
	this.lastPosition = new THREE.Vector3();
	this.lastQuaternion = new THREE.Quaternion();
  
	// 이벤트 리스너
	this.onContextMenu = function(event) {
	  if (that.enabled === false) return;
	  event.preventDefault();
	};
  
	this.onPointerDown = function(event) {
	  if (that.enabled === false) return;
  
	  // 포인터 추가
	  that.addPointer(event);
  
	  if (event.pointerType === 'touch') {
		that.onTouchStart(event);
	  } else {
		that.onMouseDown(event);
	  }
	};
  
	this.onMouseDown = function(event) {
	  // 기본 마우스 동작을 결정
	  var mouseAction;
	  switch (event.button) {
		case 0:
		  mouseAction = that.mouseButtons.LEFT;
		  break;
		case 1:
		  mouseAction = that.mouseButtons.MIDDLE;
		  break;
		case 2:
		  mouseAction = that.mouseButtons.RIGHT;
		  break;
		default:
		  mouseAction = -1;
	  }
  
	  // 동작 처리
	  switch (mouseAction) {
		case THREE.MOUSE.ROTATE:
		  that.rotateStart.set(event.clientX, event.clientY);
		  that.state = that.STATE.ROTATE;
		  break;
		case THREE.MOUSE.DOLLY:
		  that.dollyStart.set(event.clientX, event.clientY);
		  that.state = that.STATE.DOLLY;
		  break;
		case THREE.MOUSE.PAN:
		  that.panStart.set(event.clientX, event.clientY);
		  that.state = that.STATE.PAN;
		  break;
	  }
  
	  if (that.state !== that.STATE.NONE) {
		document.addEventListener('pointermove', that.onPointerMove, false);
		document.addEventListener('pointerup', that.onPointerUp, false);
		that.dispatchEvent(startEvent);
	  }
	};
  
	this.onPointerMove = function(event) {
	  if (that.enabled === false) return;
  
	  if (event.pointerType === 'touch') {
		that.onTouchMove(event);
	  } else {
		that.onMouseMove(event);
	  }
	};
  
	this.onMouseMove = function(event) {
	  switch (that.state) {
		case that.STATE.ROTATE:
		  that.rotateEnd.set(event.clientX, event.clientY);
		  that.rotateDelta.subVectors(that.rotateEnd, that.rotateStart).multiplyScalar(that.rotateSpeed);
		  
		  // 카메라 회전
		  that.rotateLeft(2 * Math.PI * that.rotateDelta.x / that.domElement.clientHeight);
		  that.rotateUp(2 * Math.PI * that.rotateDelta.y / that.domElement.clientHeight);
		  
		  that.rotateStart.copy(that.rotateEnd);
		  that.update();
		  break;
  
		case that.STATE.DOLLY:
		  that.dollyEnd.set(event.clientX, event.clientY);
		  that.dollyDelta.subVectors(that.dollyEnd, that.dollyStart);
		  
		  if (that.dollyDelta.y > 0) {
			that.dollyOut(that.getZoomScale());
		  } else if (that.dollyDelta.y < 0) {
			that.dollyIn(that.getZoomScale());
		  }
		  
		  that.dollyStart.copy(that.dollyEnd);
		  that.update();
		  break;
  
		case that.STATE.PAN:
		  that.panEnd.set(event.clientX, event.clientY);
		  that.panDelta.subVectors(that.panEnd, that.panStart).multiplyScalar(that.panSpeed);
		  
		  that.pan(that.panDelta.x, that.panDelta.y);
		  
		  that.panStart.copy(that.panEnd);
		  that.update();
		  break;
	  }
	};
  
	this.onPointerUp = function(event) {
	  // 포인터 제거
	  that.removePointer(event);
	  
	  if (that.pointers.length === 0) {
		that.domElement.releasePointerCapture(event.pointerId);
		
		document.removeEventListener('pointermove', that.onPointerMove, false);
		document.removeEventListener('pointerup', that.onPointerUp, false);
		
		that.state = that.STATE.NONE;
		that.dispatchEvent(endEvent);
	  }
	};
  
	this.onMouseWheel = function(event) {
	  if (that.enabled === false || that.enableZoom === false || that.state !== that.STATE.NONE) return;
	  
	  event.preventDefault();
	  event.stopPropagation();
	  
	  that.dispatchEvent(startEvent);
	  
	  if (event.deltaY < 0) {
		that.dollyIn(that.getZoomScale());
	  } else if (event.deltaY > 0) {
		that.dollyOut(that.getZoomScale());
	  }
	  
	  that.update();
	  that.dispatchEvent(endEvent);
	};
  
	this.onTouchStart = function(event) {
	  switch (that.pointers.length) {
		case 1:
		  switch (that.touches.ONE) {
			case THREE.TOUCH.ROTATE:
			  that.rotateStart.set(event.pageX, event.pageY);
			  that.state = that.STATE.TOUCH_ROTATE;
			  break;
			case THREE.TOUCH.PAN:
			  that.panStart.set(event.pageX, event.pageY);
			  that.state = that.STATE.TOUCH_PAN;
			  break;
		  }
		  break;
		case 2:
		  switch (that.touches.TWO) {
			case THREE.TOUCH.DOLLY_PAN:
			  // 구현 생략
			  that.state = that.STATE.TOUCH_DOLLY_PAN;
			  break;
			case THREE.TOUCH.DOLLY_ROTATE:
			  // 구현 생략
			  that.state = that.STATE.TOUCH_DOLLY_ROTATE;
			  break;
		  }
		  break;
	  }
	  
	  if (that.state !== that.STATE.NONE) {
		that.dispatchEvent(startEvent);
	  }
	};
  
	this.onTouchMove = function(event) {
	  // 구현 생략
	  that.update();
	};
  
	this.onTouchEnd = function(event) {
	  // 구현 생략
	  that.state = that.STATE.NONE;
	  that.dispatchEvent(endEvent);
	};
  
	// 헬퍼 메서드
	this.rotateLeft = function(angle) {
	  this.sphericalDelta.theta -= angle;
	};
  
	this.rotateUp = function(angle) {
	  this.sphericalDelta.phi -= angle;
	};
  
	this.dollyIn = function(dollyScale) {
	  this.scale /= dollyScale;
	};
  
	this.dollyOut = function(dollyScale) {
	  this.scale *= dollyScale;
	};
  
	this.getZoomScale = function() {
	  return Math.pow(0.95, this.zoomSpeed);
	};
  
	this.getAutoRotationAngle = function() {
	  return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
	};
  
	this.pan = function(deltaX, deltaY) {
	  var element = this.domElement;
	  
	  if (this.object.isPerspectiveCamera) {
		// 원근 카메라 처리
		var position = this.object.position;
		var offset = position.clone().sub(this.target);
		var targetDistance = offset.length();
		
		// 거리에 따른 이동 속도 조절
		targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);
		
		// 이동 계산
		var v = new THREE.Vector3();
		v.setFromMatrixColumn(this.object.matrix, 0); // x축 가져오기
		v.multiplyScalar(-2 * deltaX * targetDistance / element.clientHeight);
		
		var moveDirection = new THREE.Vector3();
		moveDirection.copy(v);
		
		v.setFromMatrixColumn(this.object.matrix, 1); // y축 가져오기
		v.multiplyScalar(2 * deltaY * targetDistance / element.clientHeight);
		
		moveDirection.add(v);
		this.panOffset.add(moveDirection);
	  } else if (this.object.isOrthographicCamera) {
		// 직교 카메라 처리
		var x = (this.object.right - this.object.left) / this.object.zoom * deltaX / element.clientWidth;
		var y = (this.object.top - this.object.bottom) / this.object.zoom * deltaY / element.clientHeight;
		
		this.panOffset.x += x;
		this.panOffset.y += y;
	  }
	};
  
	this.addPointer = function(event) {
	  this.pointers.push(event.pointerId);
	};
  
	this.removePointer = function(event) {
	  var index = this.pointers.indexOf(event.pointerId);
	  if (index !== -1) {
		this.pointers.splice(index, 1);
	  }
	  return this.pointers.length;
	};
  
	// 이벤트 디스패치
	this.dispatchEvent = function(event) {
	  if (this.addEventListener === undefined) return;
	  
	  if (this._listeners === undefined) return;
	  
	  var listeners = this._listeners;
	  if (listeners[event.type] !== undefined) {
		var array = listeners[event.type].slice(0);
		
		for (var i = 0, l = array.length; i < l; i++) {
		  array[i].call(this, event);
		}
	  }
	};
  
	this.addEventListener = function(type, listener) {
	  if (this._listeners === undefined) this._listeners = {};
	  
	  var listeners = this._listeners;
	  if (listeners[type] === undefined) {
		listeners[type] = [];
	  }
	  
	  if (listeners[type].indexOf(listener) === -1) {
		listeners[type].push(listener);
	  }
	};
  
	this.removeEventListener = function(type, listener) {
	  if (this._listeners === undefined) return;
	  
	  var listeners = this._listeners;
	  var listenerArray = listeners[type];
	  
	  if (listenerArray !== undefined) {
		var index = listenerArray.indexOf(listener);
		if (index !== -1) {
		  listenerArray.splice(index, 1);
		}
	  }
	};
  
	// 이벤트 연결
	function bind(scope, fn) {
	  return function() {
		fn.apply(scope, arguments);
	  };
	}
  
	this.onContextMenu = bind(this, this.onContextMenu);
	this.onPointerDown = bind(this, this.onPointerDown);
	this.onPointerMove = bind(this, this.onPointerMove);
	this.onPointerUp = bind(this, this.onPointerUp);
	this.onMouseDown = bind(this, this.onMouseDown);
	this.onMouseMove = bind(this, this.onMouseMove);
	this.onMouseWheel = bind(this, this.onMouseWheel);
	this.onTouchStart = bind(this, this.onTouchStart);
	this.onTouchMove = bind(this, this.onTouchMove);
	this.onTouchEnd = bind(this, this.onTouchEnd);
  
	this.domElement.addEventListener('contextmenu', this.onContextMenu);
	this.domElement.addEventListener('pointerdown', this.onPointerDown);
	this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });
	this.domElement.addEventListener('touchstart', this.onTouchStart);
	this.domElement.addEventListener('touchend', this.onTouchEnd);
	this.domElement.addEventListener('touchmove', this.onTouchMove);
  
	this.update();
  };
  
  THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
  THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
  
  // 마우스 및 터치 상수 정의
  // 이미 THREE에 정의되어 있지 않다면 추가
  if (THREE.MOUSE === undefined) {
	THREE.MOUSE = {
	  LEFT: 0,
	  MIDDLE: 1,
	  RIGHT: 2
	};
  }
  
  if (THREE.TOUCH === undefined) {
	THREE.TOUCH = {
	  ROTATE: 0,
	  PAN: 1,
	  DOLLY_PAN: 2,
	  DOLLY_ROTATE: 3
	};
  }