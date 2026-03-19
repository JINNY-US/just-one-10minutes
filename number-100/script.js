const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetBtn = document.getElementById('reset-button');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

let score = 0;
let grid = [];
let selectedTile = null;
const LIMIT_TIME = 60; // 60초 게임
let timeLeft = LIMIT_TIME;
let timerInterval;

function initGame() {
    score = 0;
    timeLeft = LIMIT_TIME;
    scoreDisplay.textContent = `Score: ${score}`;
    updateTimerDisplay();
    createGrid();
    renderBoard();
}

function createGrid() {
    grid = [];
    for (let r = 0; r < 4; r++) {
        let row = [];
        for (let c = 0; c < 4; c++) {
            row.push(Math.floor(Math.random() * 99) + 1);
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
        renderBoard();
    } else {
        const dr = Math.abs(selectedTile.r - r);
        const dc = Math.abs(selectedTile.c - c);

        // 인접한 타일인지 확인 (가로세로 1칸)
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            const sum = grid[selectedTile.r][selectedTile.c] + grid[r][c];

            if (sum <= 100) {
                if (sum === 100) {
                    // 100 달성! 두 타일 모두 제거
                    grid[selectedTile.r][selectedTile.c] = 0;
                    grid[r][c] = 0;
                    score += 100;
                    scoreDisplay.textContent = `Score: ${score}`;
                } else {
                    // 100 미만, 합치기
                    grid[r][c] = sum;
                    grid[selectedTile.r][selectedTile.c] = 0;
                }
                applyGravity();
                selectedTile = null;
                renderBoard();
            } else {
                // 100 초과, 선택 해제
                selectedTile = { r, c };
                renderBoard();
            }
        } else {
            // 인접하지 않은 타일 클릭 시 선택 변경
            selectedTile = { r, c };
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
        // 맨 위에 새 숫자 생성
        for (let r = 0; r < emptySpaces; r++) {
            grid[r][c] = Math.floor(Math.random() * 99) + 1;
        }
    }
}

function updateTimerDisplay() {
    const widthPercent = (timeLeft / LIMIT_TIME) * 100;
    timerBar.style.width = `${widthPercent}%`;
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert(`게임 종료! 최종 점수: ${score}`);
            startOverlay.style.display = 'flex';
        }
    }, 100);
}

startBtn.onclick = () => {
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
