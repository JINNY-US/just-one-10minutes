const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetBtn = document.getElementById('reset-btn');

let score = 0;
let stage = 1;
const LIMIT_TIME = 15; // 15초 제한
let timeLeft = LIMIT_TIME;
let timerInterval;

function getRandomColor() {
    const r = Math.floor(Math.random() * 150) + 50;
    const g = Math.floor(Math.random() * 150) + 50;
    const b = Math.floor(Math.random() * 150) + 50;
    return { r, g, b };
}

function updateTimerDisplay() {
    // 남은 시간에 따라 바의 너비(%) 계산
    const widthPercent = (timeLeft / LIMIT_TIME) * 100;
    timerBar.style.width = `${widthPercent}%`;
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = LIMIT_TIME;
    updateTimerDisplay();
    
    // 100ms마다 실행하여 더 부드러운 애니메이션 효과
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
    const diff = Math.max(20 - Math.floor(stage / 3), 5);
    const targetIndex = Math.floor(Math.random() * (size * size));

    for (let i = 0; i < size * size; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        
        if (i === targetIndex) {
            tile.style.backgroundColor = `rgb(${baseColor.r + diff}, ${baseColor.g + diff}, ${baseColor.b + diff})`;
            tile.onclick = () => {
                score += stage * 10;
                stage++;
                scoreDisplay.textContent = `Score: ${score}`;
                createBoard();
                startTimer(); // 정답 시 시간 초기화
            };
        } else {
            tile.style.backgroundColor = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
            tile.onclick = () => {
                timeLeft -= 3; // 오답 시 3초 감점
                if (timeLeft < 0) timeLeft = 0;
                updateTimerDisplay();
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
