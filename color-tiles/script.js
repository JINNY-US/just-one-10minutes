const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetBtn = document.getElementById('reset-btn');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

let score = 0;
let stage = 1;
const LIMIT_TIME = 15; 
let timeLeft = LIMIT_TIME;
let timerInterval;
let lastTargetIndex = -1; // 이전 정답 위치 기억

function getRandomColor() {
    // 0~255 전체 범위를 사용하여 훨씬 다양한 색상 생성
    // 정답 타일이 너무 밝아져서 안 보이는 것을 방지하기 위해 base는 최대 230으로 제한
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return { r, g, b };
}

function updateTimerDisplay() {
    const widthPercent = (timeLeft / LIMIT_TIME) * 100;
    timerBar.style.width = `${widthPercent}%`;
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = LIMIT_TIME;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert(`게임 오버! 최종 점수: ${score}`);
            resetGame();
        }
    }, 100);
}

function createBoard() {
    gameBoard.innerHTML = '';
    const size = Math.min(Math.floor((stage + 1) / 2) + 1, 9);
    gameBoard.className = `grid-${size}`;

    const baseColor = getRandomColor();
    // 스테이지가 올라갈수록 색상 차이(diff)가 줄어듦 (최소 3까지)
    const diff = Math.max(25 - Math.floor(stage / 2), 3);
    
    // 새로운 정답 위치 결정 (이전 위치와 겹치지 않게)
    let targetIndex;
    const totalTiles = size * size;
    do {
        targetIndex = Math.floor(Math.random() * totalTiles);
    } while (targetIndex === lastTargetIndex && totalTiles > 1);
    
    lastTargetIndex = targetIndex; // 현재 위치 저장

    for (let i = 0; i < totalTiles; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        
        if (i === targetIndex) {
            // 정답 타일: 미세하게 다른 색
            tile.style.backgroundColor = `rgb(${baseColor.r + diff}, ${baseColor.g + diff}, ${baseColor.b + diff})`;
            tile.onclick = () => {
                score += stage * 10;
                stage++;
                scoreDisplay.textContent = `Score: ${score}`;
                createBoard();
                startTimer();
            };
        } else {
            // 일반 타일
            tile.style.backgroundColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
            tile.onclick = () => {
                timeLeft -= 3;
                if (timeLeft < 0) timeLeft = 0;
                updateTimerDisplay();
                
                // 틀렸을 때 시각적 효과 (깜빡임)
                tile.style.backgroundColor = '#ff0000';
                setTimeout(() => {
                    tile.style.backgroundColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
                }, 100);
            };
        }
        gameBoard.appendChild(tile);
    }
}

function resetGame() {
    clearInterval(timerInterval);
    score = 0;
    stage = 1;
    lastTargetIndex = -1;
    scoreDisplay.textContent = `Score: ${score}`;
    timerBar.style.width = '100%';
    startOverlay.style.display = 'flex';
}

startBtn.onclick = () => {
    startOverlay.style.display = 'none';
    createBoard();
    startTimer();
};

resetBtn.onclick = resetGame;

// 초기 화면 설정
createBoard();
clearInterval(timerInterval);
timerBar.style.width = '100%';
