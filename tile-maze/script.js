// Tile Maze - 무한 확장 슬라이딩 미로 로직
const VIEW_SIZE = 11;
const gameBoard = document.getElementById('game-board');
const boardContainer = document.getElementById('board-container');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const resetBtn = document.getElementById('reset-button');
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

let score = 0;
let playerPos = { x: 0, y: 0 };
let mazeMap = new Map();
let isGameOver = false;
let isMoving = false;

// 초기 상태: 블러 처리
boardContainer.classList.add('overlay-active');

function getTile(x, y) {
    const key = `${x},${y}`;
    if (!mazeMap.has(key)) {
        if (Math.abs(x) <= 1 && Math.abs(y) <= 1) {
            mazeMap.set(key, null);
        } else {
            const isStopTile = Math.random() < 0.01;
            if (isStopTile) {
                mazeMap.set(key, null);
            } else {
                const directions = ['up', 'down', 'left', 'right'];
                const dir = directions[Math.floor(Math.random() * directions.length)];
                mazeMap.set(key, dir);
            }
        }
    }
    return mazeMap.get(key);
}

function renderView() {
    gameBoard.innerHTML = '';
    const startX = playerPos.x - Math.floor(VIEW_SIZE / 2);
    const startY = playerPos.y - Math.floor(VIEW_SIZE / 2);

    for (let y = startY; y < startY + VIEW_SIZE; y++) {
        for (let x = startX; x < startX + VIEW_SIZE; x++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            const dir = getTile(x, y);
            
            if (x === playerPos.x && y === playerPos.y) {
                tile.classList.add('player');
            } else if (dir) {
                tile.classList.add('arrow');
                tile.textContent = getArrowChar(dir);
            } else {
                tile.classList.add('empty-tile');
            }
            gameBoard.appendChild(tile);
        }
    }
}

function getArrowChar(dir) {
    switch(dir) {
        case 'up': return '↑';
        case 'down': return '↓';
        case 'left': return '←';
        case 'right': return '→';
    }
}

async function movePlayer(dx, dy) {
    if (isGameOver || isMoving) return;
    isMoving = true;

    let path = new Set();

    while (true) {
        let nextX = playerPos.x + dx;
        let nextY = playerPos.y + dy;

        const state = `${nextX},${nextY}`;
        if (path.has(state)) {
            gameOver("무한 루프 함정에 빠졌습니다!");
            break;
        }
        path.add(state);

        playerPos.x = nextX;
        playerPos.y = nextY;
        score++;
        updateScore();
        renderView();

        const arrow = getTile(playerPos.x, playerPos.y);
        if (!arrow) break;

        if (arrow === 'up') { dx = 0; dy = -1; }
        else if (arrow === 'down') { dx = 0; dy = 1; }
        else if (arrow === 'left') { dx = -1; dy = 0; }
        else if (arrow === 'right') { dx = 1; dy = 0; }

        await new Promise(r => setTimeout(r, 60));
        if (isGameOver) break;
    }
    isMoving = false;
}

function updateScore() {
    scoreElement.textContent = `Score: ${score}`;
}

function gameOver(reason) {
    isGameOver = true;
    isMoving = false;
    document.getElementById('game-over-title').textContent = reason;
    finalScoreElement.textContent = `Score: ${score}`;
    gameOverOverlay.classList.remove('hidden');
    boardContainer.classList.add('overlay-active');
}

function startGame() {
    score = 0;
    playerPos = { x: 0, y: 0 };
    mazeMap.clear();
    isGameOver = false;
    isMoving = false;
    updateScore();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    boardContainer.classList.remove('overlay-active');
    renderView();
}

// 초기 보드 보여주기 (블러 상태로)
renderView();

// 이벤트 리스너
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
    if (isGameOver || isMoving || startOverlay.offsetParent !== null) return;
    switch(e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
    }
});
