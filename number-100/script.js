const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetBtn = document.getElementById('reset-button');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

// 효과음 객체
const sounds = {
    start: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    select: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    merge: new Audio('https://assets.mixkit.co/active_storage/sfx/2567/2568-preview.mp3'),
    success: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'), // 확실히 재생되는 톡 터지는 소리
    gameOver: new Audio('https://assets.mixkit.co/active_storage/sfx/133/133-preview.mp3')
};

let score = 0;
let grid = []; // 이제 숫자가 아닌 { value, moves } 객체를 담습니다.
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
    let val;
    if (Math.random() < 0.4) {
        val = Math.floor(Math.random() * 15) + 1;
    } else {
        let additionalRange = Math.min(elapsedTime * 0.3, 30);
        let maxRange = 20 + additionalRange; 
        val = Math.floor(Math.random() * maxRange) + 1;
    }
    // 객체 형태로 반환 (값과 해당 타일의 누적 이동 횟수)
    return { value: val, moves: 0 };
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
            const tileData = grid[r][c];
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.textContent = tileData.value;
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
        sounds.select.currentTime = 0;
        sounds.select.play();
        renderBoard();
    } else {
        const dr = Math.abs(selectedTile.r - r);
        const dc = Math.abs(selectedTile.c - c);

        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            const tile1 = grid[selectedTile.r][selectedTile.c];
            const tile2 = grid[r][c];
            const sum = tile1.value + tile2.value;
            const totalMoves = tile1.moves + tile2.moves + 1; // 이동 횟수 합산

            if (sum <= 100) {
                // [변경] 합칠 때마다 즉시 점수 부여
                score += sum;

                if (sum === 100) {
                    sounds.success.currentTime = 0;
                    sounds.success.play();
                    
                    // [변경] 100 완성 보너스: 이동 횟수가 적을수록 큰 점수 (최대 200, 최소 50)
                    const bonus = Math.max(50, 250 - (totalMoves * 30));
                    score += bonus;
                    
                    grid[selectedTile.r][selectedTile.c] = { value: 0, moves: 0 };
                    grid[r][c] = { value: 0, moves: 0 };
                    
                    timeLeft = Math.min(timeLeft + 5, LIMIT_TIME);
                } else {
                    sounds.start.currentTime = 0;
                    sounds.start.play();
                    grid[r][c] = { value: sum, moves: totalMoves };
                    grid[selectedTile.r][selectedTile.c] = { value: 0, moves: 0 };
                }
                
                scoreDisplay.textContent = `Score: ${score}`;
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
            if (grid[r][c].value === 0) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                grid[r + emptySpaces][c] = grid[r][c];
                grid[r][c] = { value: 0, moves: 0 };
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
            sounds.gameOver.play();
            alert(`게임 종료! 최종 점수: ${score}`);
            startOverlay.style.display = 'flex';
        }
    }, 100);
}

startBtn.onclick = () => {
    sounds.start.play();
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
