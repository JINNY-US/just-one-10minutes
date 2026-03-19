const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');

let score = 0;
let stage = 1;
let timeLeft = 15;
let timerInterval;

function getRandomColor() {
    // 너무 밝거나 어두운 색을 피하기 위해 50~200 범위 사용
    const r = Math.floor(Math.random() * 150) + 50;
    const g = Math.floor(Math.random() * 150) + 50;
    const b = Math.floor(Math.random() * 150) + 50;
    return { r, g, b };
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 15;
    timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert(`게임 오버! 최종 점수: ${score}`);
            resetGame();
        }
    }, 1000);
}

function createBoard() {
    gameBoard.innerHTML = '';
    // 스테이지가 올라갈수록 그리드 크기 증가 (최대 9x9)
    const size = Math.min(Math.floor((stage + 1) / 2) + 1, 9);
    gameBoard.className = `grid-${size}`;

    const baseColor = getRandomColor();
    // 스테이지가 올라갈수록 색상 차이(diff)를 줄여 난이도 상승 (최소 5)
    const diff = Math.max(20 - Math.floor(stage / 3), 5);
    const targetIndex = Math.floor(Math.random() * (size * size));

    for (let i = 0; i < size * size; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        
        if (i === targetIndex) {
            // 정답 타일: 약간 밝은 색
            tile.style.backgroundColor = `rgb(${baseColor.r + diff}, ${baseColor.g + diff}, ${baseColor.b + diff})`;
            tile.onclick = () => {
                score += stage * 10;
                stage++;
                scoreDisplay.textContent = `Score: ${score}`;
                createBoard();
                startTimer(); // 정답 시 시간 초기화
            };
        } else {
            // 일반 타일
            tile.style.backgroundColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
            tile.onclick = () => {
                // 오답 시 3초 감점
                timeLeft -= 3;
                if (timeLeft < 0) timeLeft = 0;
                timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
                // 시각적 피드백 (흔들림 효과 등 추가 가능)
                tile.style.opacity = '0.5';
                setTimeout(() => { tile.style.opacity = '1'; }, 100);
            };
        }
        gameBoard.appendChild(tile);
    }
}

function resetGame() {
    clearInterval(timerInterval);
    score = 0;
    stage = 1;
    scoreDisplay.textContent = `Score: ${score}`;
    createBoard();
    startTimer();
}

resetBtn.onclick = resetGame;

// 초기 게임 시작
resetGame();
