// Tile Maze - 정답 경로가 하나인 무한 슬라이딩 미로
const VIEW_W = 11;
const VIEW_H = 7;
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
let playerPos = { x: 0, y: 3 }; 
let mazeMap = new Map(); 
let pathExitY = 3; // 이전 열의 정답 경로가 끝난 Y 좌표
let isGameOver = false;
let isMoving = false;

// 초기 상태: 블러 처리
boardContainer.classList.add('overlay-active');

// 타일 생성 로직
function generateColumn(x) {
    if (mazeMap.has(`${x},0`)) return;

    if (x === 0) {
        // 첫 번째 줄은 무조건 모두 빈칸으로 고정
        for (let y = 0; y < VIEW_H; y++) {
            mazeMap.set(`${x},${y}`, null);
        }
        // 시작 열(x=1)에서의 정답 입구 좌표 결정
        pathExitY = Math.floor(Math.random() * VIEW_H);
        return;
    }

    // 이번 열에서 정답 경로 생성
    const entranceY = pathExitY;
    let currentY = entranceY;
    let columnPathKeys = new Set();

    // 1. 수직 이동 결정 (0~2칸)
    if (Math.random() < 0.5) {
        const moveCount = Math.floor(Math.random() * 2) + 1; // 1~2칸
        const direction = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < moveCount; i++) {
            const nextY = currentY + direction;
            if (nextY >= 0 && nextY < VIEW_H) {
                mazeMap.set(`${x},${currentY}`, direction === -1 ? 'up' : 'down');
                columnPathKeys.add(`${x},${currentY}`);
                currentY = nextY;
            } else break;
        }
    }

    // 2. 마지막엔 반드시 오른쪽으로 나가도록 설정
    mazeMap.set(`${x},${currentY}`, 'right');
    columnPathKeys.add(`${x},${currentY}`);
    pathExitY = currentY; // 다음 열을 위해 출구 좌표 저장

    // 3. 나머지 타일은 함정으로 채움
    for (let y = 0; y < VIEW_H; y++) {
        const key = `${x},${y}`;
        if (columnPathKeys.has(key)) continue;

        // 함정은 주로 루프(left)나 벽(up, down)을 향하게 함
        const trapDirs = ['up', 'down', 'left', 'right'];
        const dir = trapDirs[Math.floor(Math.random() * trapDirs.length)];
        mazeMap.set(key, dir);
    }
}

function renderView() {
    gameBoard.innerHTML = '';
    const scrollX = Math.max(0, playerPos.x - 5);

    for (let y = 0; y < VIEW_H; y++) {
        for (let x = scrollX; x < scrollX + VIEW_W; x++) {
            generateColumn(x);
            
            const tile = document.createElement('div');
            tile.classList.add('tile');
            const dir = mazeMap.get(`${x},${y}`);
            
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

    let pathTrace = new Set();

    while (true) {
        let nextX = playerPos.x + dx;
        let nextY = playerPos.y + dy;

        // 벽 충돌 검사
        if (nextY < 0 || nextY >= VIEW_H || nextX < 0) {
            gameOver("벽에 부딪혔습니다!");
            break;
        }

        const state = `${nextX},${nextY}`;
        if (pathTrace.has(state)) {
            gameOver("무한 루프 함정에 빠졌습니다!");
            break;
        }
        pathTrace.add(state);

        // 점수 계산 로직 개선
        const currentTileDir = mazeMap.get(`${playerPos.x},${playerPos.y}`);
        const nextTileDir = mazeMap.get(`${nextX},${nextY}`);
        
        // 화살표에서 출발하거나, 화살표로 들어가는 경우에만 점수 증가
        const isFromArrow = currentTileDir !== null;
        const isToArrow = nextTileDir !== null;

        playerPos.x = nextX;
        playerPos.y = nextY;

        if (isFromArrow || isToArrow) {
            score++;
            updateScore();
        }
        
        renderView();

        const arrow = mazeMap.get(`${playerPos.x},${playerPos.y}`);
        if (!arrow) break; // 빈칸(정지 타일) 도착

        if (arrow === 'up') { dx = 0; dy = -1; }
        else if (arrow === 'down') { dx = 0; dy = 1; }
        else if (arrow === 'left') { dx = -1; dy = 0; }
        else if (arrow === 'right') { dx = 1; dy = 0; }

        await new Promise(r => setTimeout(r, 150));
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
    playerPos = { x: 0, y: 3 };
    mazeMap.clear();
    isGameOver = false;
    isMoving = false;
    updateScore();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    boardContainer.classList.remove('overlay-active');
    renderView();
}

renderView();

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
    if (isGameOver || isMoving || !startOverlay.classList.contains('hidden')) return;
    switch(e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
    }
});
