const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetBtn = document.getElementById('reset-button');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

// 효과음 객체 생성
const sounds = {
    start: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    select: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    merge: new Audio('https://assets.mixkit.co/active_storage/sfx/2567/2568-preview.mp3'), // 소폭 변경
    success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
    gameOver: new Audio('https://assets.mixkit.co/active_storage/sfx/133/133-preview.mp3')
};

let score = 0;
let grid = [];
let selectedTile = null;
const LIMIT_TIME = 120; 
let timeLeft = LIMIT_TIME;
let timerInterval;
let startTime = 0;

function initGame() {
    score = 0;
    timeLeft = LIMIT_TIME;
    startTime = Date.now();
    scoreDisplay.textContent = `Score: ${score}`;
    updateTimerDisplay();
    createGrid();
    renderBoard();
}

function getRandomNumber() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (Math.random() < 0.4) {
        return Math.floor(Math.random() * 15) + 1;
    }
    let additionalRange = Math.min(elapsedTime * 0.3, 30);
    let maxRange = 20 + additionalRange; 
    return Math.floor(Math.random() * maxRange) + 1;
}

function createGrid() {
    grid = [];
    for (let r = 0; r < 4; r++) {
        let row = [];
        for (let c = 0; c < 4; c++) {
            row.push(getRandomNumber());
        }
        grid.push(row);
    }
}

function renderBoard() {
    gameBoard.innerHTML = '';
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.textContent = grid[r][c];
            tile.dataset.row = r;
            tile.dataset.col = c;
            
            if (selectedTile && selectedTile.r === r && selectedTile.c === c) {
                tile.classList.add('selected');
            }
            
            tile.onclick = () => handleTileClick(r, c);
            gameBoard.appendChild(tile);
        }
    }
}

function handleTileClick(r, c) {
    if (!timerInterval) return;

    if (!selectedTile) {
        selectedTile = { r, c };
        sounds.select.currentTime = 0; // 소리 겹침 방지 위해 초기화 후 재생
        sounds.select.play();
        renderBoard();
    } else {
        const dr = Math.abs(selectedTile.r - r);
        const dc = Math.abs(selectedTile.c - c);

        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            const sum = grid[selectedTile.r][selectedTile.c] + grid[r][c];

            if (sum <= 100) {
                if (sum === 100) {
                    // 성공 시 효과음
                    sounds.success.currentTime = 0;
                    sounds.success.play();
                    grid[selectedTile.r][selectedTile.c] = 0;
                    grid[r][c] = 0;
                    score += 100;
                    scoreDisplay.textContent = `Score: ${score}`;
                    timeLeft = Math.min(timeLeft + 5, LIMIT_TIME);
                    updateTimerDisplay();
                } else {
                    // 합쳐질 때 효과음
                    sounds.start.currentTime = 0;
                    sounds.start.play();
                    grid[r][c] = sum;
                    grid[selectedTile.r][selectedTile.c] = 0;
                }
                applyGravity();
                selectedTile = null;
                renderBoard();
            } else {
                selectedTile = { r, c };
                sounds.select.currentTime = 0;
                sounds.select.play();
                renderBoard();
            }
        } else {
            selectedTile = { r, c };
            sounds.select.currentTime = 0;
            sounds.select.play();
            renderBoard();
        }
    }
}

function applyGravity() {
    for (let c = 0; c < 4; c++) {
        let emptySpaces = 0;
        for (let r = 3; r >= 0; r--) {
            if (grid[r][c] === 0) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                grid[r + emptySpaces][c] = grid[r][c];
                grid[r][c] = 0;
            }
        }
        for (let r = 0; r < emptySpaces; r++) {
            grid[r][c] = getRandomNumber();
        }
    }
}

function updateTimerDisplay() {
    const widthPercent = (timeLeft / LIMIT_TIME) * 100;
    timerBar.style.width = `${widthPercent}%`;
    if (timeLeft < 20) { 
        timerBar.style.backgroundColor = "#ff0000";
    } else {
        timerBar.style.backgroundColor = "#e74c3c";
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            sounds.gameOver.play(); // 게임 오버 효과음
            alert(`게임 종료! 최종 점수: ${score}`);
            startOverlay.style.display = 'flex';
        }
    }, 100);
}

startBtn.onclick = () => {
    sounds.start.play(); // 게임 시작 시 효과음
    startOverlay.style.display = 'none';
    initGame();
    startTimer();
};

resetBtn.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    startOverlay.style.display = 'flex';
    initGame();
};

initGame();
updateTimerDisplay();
