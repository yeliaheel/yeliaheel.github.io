let img;
let points = [];
let density = 2;
let initialScaleFactor = 0.5; // SEEING IS BELIEVING 용
let imageScaleFactor = 1; // 새로운 랜덤 이미지 용
let pointSize = 2;
let exploded = false;
let explosionSpeed = 4;
let moveFreely = false;
let freeMoveSpeed = 2;
let explosionTime = 2000;
let explosionStartTime;
let video;
let tracker;
let cameraActivated = false;
let lookingAtScreen = false;
let requiredGazeTime = 3000;
let particlesMovingToImage = false;
let bottomInstructionTimeout;
let isBottomVisible = false;
let blinkingInterval;

let images = ["1.png", "2.png", "3.png", "4.png", "5.png","6.png","7.png","8.png",
    "9.png","10.png","11.png","12.png","13.png","14.png","15.png"
];

function preload() {
    img = loadImage('./img/2x/Asset1@2x-8.png'); // SEEING IS BELIEVING 이미지
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(255);

    // 처음에는 커서를 pointer로 설정
    document.querySelector("canvas").style.cursor = "pointer";

    img.resize(img.width * initialScaleFactor, img.height * initialScaleFactor);
    img.loadPixels();
    
    let imgWidth = img.width;
    let imgHeight = img.height;
    let centerX = width / 2 - imgWidth / 2;
    let centerY = height / 2 - imgHeight / 2;

    for (let x = 0; x < img.width; x += density) {
        for (let y = 0; y < img.height; y += density) {
            let index = (x + y * img.width) * 4;
            let brightnessValue = (img.pixels[index] + img.pixels[index + 1] + img.pixels[index + 2]) / 3;

            // 🔹 기존 brightness 조건 유지, 단 50% 확률로 생략하여 개수 절반으로 줄이기
            if (brightnessValue < 200 && random() < 0.2) { 
                let randomOffsetX = random(-density * 0.4, density * 0.4);
                let randomOffsetY = random(-density * 0.4, density * 0.4);

                points.push({
                    x: centerX + x + randomOffsetX,
                    y: centerY + y + randomOffsetY,
                    baseX: centerX + x + randomOffsetX,
                    baseY: centerY + y + randomOffsetY,
                    moving: false,
                    velocityX: random(-1, 1),
                    velocityY: random(-1, 1),
                    speedMultiplier: random(1, 3),
                    size: pointSize
                });
            }
        }
    }
}

function draw() {
    background(255);
    fill(0);
    noStroke();

    if (!exploded) {
        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            p.x = p.baseX + sin(frameCount * 0.05 + p.velocityX) * 6 + random(-2, 2);
            p.y = p.baseY + cos(frameCount * 0.05 + p.velocityY) * 6 + random(-2, 2);
            ellipse(p.x, p.y, pointSize, pointSize);
        }
    } else {
        if (particlesMovingToImage) {
            for (let i = 0; i < points.length; i++) {
                let p = points[i];
                if (p.moving) {
                    p.x = lerp(p.x, p.targetX, 0.2);
                    p.y = lerp(p.y, p.targetY, 0.2);
                    p.size = lerp(p.size, p.finalSize, 0.1);
                }
                ellipse(p.x, p.y, p.size, p.size);
            }
        } else {
            // ✅ 점진적으로 확산하는 효과 추가
            for (let i = 0; i < points.length; i++) {
                let p = points[i];

                p.x += p.velocityX;
                p.y += p.velocityY;

                // ✅ 확산 속도를 점진적으로 증가
                p.velocityX *= 1.05;
                p.velocityY *= 1.05;

                ellipse(p.x, p.y, p.size, p.size);
            }
        }
    }
    
}

function updateInstructions() {
    let bottomText = document.getElementById("instruction-bottom");

    if (particlesMovingToImage) {
        // ✅ bottom instruction을 7.5초 후에 표시
        if (!isBottomVisible) {
            bottomInstructionTimeout = setTimeout(() => {
                bottomText.style.visibility = "visible";
                bottomText.style.opacity = "1";
                isBottomVisible = true;

                // ✅ 깜빡이는 효과 시작 (1초 간격으로 깜빡임)
                blinkingInterval = setInterval(() => {
                    bottomText.style.opacity = bottomText.style.opacity === "1" ? "0" : "1";
                }, 1000);

            }, 7500);
        }
    } else {
        // ✅ 사용자가 고개를 돌리면 즉시 사라짐
        clearTimeout(bottomInstructionTimeout);
        clearInterval(blinkingInterval); // ✅ 깜빡이는 효과 중지
        bottomText.style.opacity = "0";
        setTimeout(() => {
            bottomText.style.visibility = "hidden";
        }); // ✅ 반투명 효과 후 완전히 숨김
        isBottomVisible = false;
    }
}


function scatterParticles() {
    for (let i = 0; i < points.length; i++) {
        let p = points[i];

        // ✅ 기존 위치에서 랜덤하게 확산 시작 (점진적 확산)
        let angle = random(TWO_PI);
        let baseSpeed = random(200, 200); // ✅ 초기 속도 낮게 설정
        let expansionFactor = 1.05; // ✅ 점진적으로 확장하는 비율

        // ✅ 더 넓게 퍼질 수 있도록 설정
        p.velocityX = cos(angle) * baseSpeed;
        p.velocityY = sin(angle) * baseSpeed;

        p.size = 2;

        p.moving = true;
    }
    updateInstructions(); // Instruction 상태 업데이트
}

function mousePressed() {
    if (!exploded) {
        exploded = true;
        explosionStartTime = millis();
        document.querySelector("canvas").style.cursor = "default";
        
        // 🔥 확산 속도와 범위 증가
        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            p.velocityX = random(-5, 5); // 랜덤한 방향으로 강한 힘 추가
            p.velocityY = random(-5, 5);
            p.speedMultiplier = random(3, 6); // 기존보다 빠르게 확산
        }
        
        activateCamera();
    // 🔹 1초 후 텍스트 표시
    setTimeout(() => {
        let topText = document.getElementById("instruction-top");
        let bottomText = document.getElementById("instruction-bottom");

        topText.style.opacity = "1";  // **투명도 1로 변경**
        topText.style.visibility = "visible";  // **숨김 해제**
       

        // 🔹 3초 후 텍스트 숨김
        setTimeout(() => {
            topText.style.opacity = "0";  // **다시 투명**
            topText.style.visibility = "hidden";  // **공간 차지 않도록 숨김**
        }, 5000);
    }, 1500);

// 🔹 5초 후 상단 버튼 표시
setTimeout(() => {
    let backButton = document.getElementById("top-left");
    let infoButton = document.getElementById("top-right");

    if (backButton && infoButton) {
        backButton.style.opacity = "1";  
        backButton.style.visibility = "visible";  
        infoButton.style.opacity = "1";  
        infoButton.style.visibility = "visible";  
    }
}, 20000);
}
}

function activateCamera() {
    if (!cameraActivated) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                video = createCapture(VIDEO);
                video.size(320, 240);
                video.hide();

                tracker = ml5.facemesh(video, modelReady);
                tracker.on("predict", gotResults);
                cameraActivated = true;
            })
            .catch(function(err) {
                console.error("웹캠 접근 거부됨:", err);
            });
    }
}

function modelReady() {
    console.log("✅ FaceMesh 모델 로드 완료!");
}

function gotResults(results) {
    if (results.length > 0) {
        let keypoints = results[0].scaledMesh;

        // ✅ 새롭게 찾은 눈동자 좌표
        let leftEyeCenter = keypoints[466];  
        let rightEyeCenter = keypoints[464];  

        console.log("왼쪽 눈동자 좌표:", leftEyeCenter);
        console.log("오른쪽 눈동자 좌표:", rightEyeCenter);

        let eyeDistance = dist(leftEyeCenter[0], leftEyeCenter[1], rightEyeCenter[0], rightEyeCenter[1]);
        let avgZ = (leftEyeCenter[2] + rightEyeCenter[2]) / 2;

        console.log(`👁 눈동자 거리: ${eyeDistance}, 평균 z 값: ${avgZ}`);

        // ✅ 눈 감김 감지 (z 값이 -10 이하이거나 눈동자 거리가 매우 짧을 때 감김으로 판단)
        if (avgZ < -10 || eyeDistance < 7) {
            console.log("❌ 눈 감김 감지: z 값이 -10 이하 또는 눈 사이 거리 7 이하!");
            lookingAtScreen = false;
            particlesMovingToImage = false;
            scatterParticles();
            return;
        }

        // ✅ 눈 감지 기준
        if (eyeDistance > 10 && eyeDistance < 50) {
            lookingAtScreen = true;
            if (!particlesMovingToImage) {
                generateImageParticles();
            }
        } else {
            lookingAtScreen = false;
            particlesMovingToImage = false;
            scatterParticles();
        }

       
    } else {
        lookingAtScreen = false;
        particlesMovingToImage = false;
        scatterParticles();
    }
}


function generateImageParticles() {
    let randomImage = loadImage(`./images/${random(images)}`, img => {
        let newHeight = floor(height * imageScaleFactor);
        let newWidth = floor(newHeight * (img.width / img.height));
        img.resize(newWidth, newHeight);
        img.loadPixels();

        let imgWidth = img.width;
        let imgHeight = img.height;
        let centerX = (width - imgWidth) / 2;
        let centerY = (height - imgHeight) / 2;

        points = []; // 기존 points 배열 초기화

        for (let x = 0; x < img.width; x += density) {
            for (let y = 0; y < img.height; y += density) {
                let idx = (x + y * img.width) * 4;
                let brightness = (img.pixels[idx] + img.pixels[idx + 1] + img.pixels[idx + 2]) / 3;

                if (brightness < 250) { 
                    let randomOffsetX = random(-density * 0.3, density * 0.3);
                    let randomOffsetY = random(-density * 0.3, density * 0.3);

                    // 🔹 Seeing is Believing의 분포를 유지하면서 외곽에서 시작
                    let startX = random(width * -0.2, width * 1.2);
                    let startY = random(height * -0.2, height * 1.2);

                    // 🔹 명암 대비 유지 + 초반에는 동일 크기
                    let particleSize = map(brightness, 0, 255, 3.5, 0.5);
                    if (particleSize < 0.5) particleSize = 0.5;

                    points.push({
                        x: startX, // 🔹 화면 전역에서 시작 (Seeing is Believing과 유사)
                        y: startY,
                        targetX: centerX + x + randomOffsetX, 
                        targetY: centerY + y + randomOffsetY,
                        size: pointSize, // 🔹 초기 크기는 Seeing is Believing과 동일
                        finalSize: particleSize, // 🔹 명암 반영한 최종 크기
                        moving: true
                    });
                }
            }
        }
        particlesMovingToImage = true;
        updateInstructions(); // Instruction 상태 업데이트
    });
}

document.addEventListener("DOMContentLoaded", function () {
    let infoButton = document.getElementById("info-button");
    let tooltip = document.getElementById("tooltip");

    infoButton.addEventListener("mousemove", function (event) {
        let offsetX = 15; // 마우스 오른쪽으로 10px 이동
        let offsetY = 10;  // 마우스 아래로 5px 이동
    
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";
        tooltip.style.left = event.pageX + offsetX + "px"; // 마우스 더 가깝게
        tooltip.style.top = event.pageY + offsetY + "px";  // 마우스 더 가깝게
    });

    // 🔹 마우스 나가면 툴팁 사라짐
    infoButton.addEventListener("mouseleave", function () {
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
    });

    // 🔹 Back 버튼 클릭 시 페이지 새로고침
    document.getElementById("back-button").addEventListener("click", function () {
        location.reload(); // 페이지 새로고침
    });
});

