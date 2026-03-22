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
        // 시작 지점(0,0) 주변 3x3은 무조건 빈칸
        if (Math.abs(x) <= 1 && Math.abs(y) <= 1) {
            mazeMap.set(key, null);
        } else {
            // 빈칸 확률 3%로 상향
            const isStopTile = Math.random() < 0.03;
            if (isStopTile) {
                mazeMap.set(key, null);
            } else {
                const directions = ['up', 'down', 'left', 'right'];
                let dir = directions[Math.floor(Math.random() * directions.length)];
                
                // 인접 타일과 서로 마주보는 루프 방지 로직
                // (왼쪽 타일이 오른쪽을 보고 있다면, 현재 타일은 왼쪽을 보지 않도록 함)
                const leftTile = mazeMap.get(`${x-1},${y}`);
                const rightTile = mazeMap.get(`${x+1},${y}`);
                const topTile = mazeMap.get(`${x},${y-1}`);
                const bottomTile = mazeMap.get(`${x},${y+1}`);

                if (leftTile === 'right' && dir === 'left') dir = 'up';
                if (rightTile === 'left' && dir === 'right') dir = 'down';
                if (topTile === 'down' && dir === 'up') dir = 'right';
                if (bottomTile === 'up' && dir === 'down') dir = 'left';

                mazeMap.set(key, dir);
            }
        }
    }
    return mazeMap.get(key);
}

// 시작 시 최소 한 방향은 나갈 수 있도록 보장
function ensurePathFromStart() {
    const exits = [
        { x: 0, y: -2, dir: 'up' },    // 위쪽 탈출
        { x: 0, y: 2, dir: 'down' },   // 아래쪽 탈출
        { x: -2, y: 0, dir: 'left' },  // 왼쪽 탈출
        { x: 2, y: 0, dir: 'right' }   // 오른쪽 탈출
    ];
    
    // 4방향 중 하나를 랜덤하게 골라 나가는 방향으로 설정
    const luckyExit = exits[Math.floor(Math.random() * exits.length)];
    mazeMap.set(`${luckyExit.x},${luckyExit.y}`, luckyExit.dir);
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
    path.add(`${playerPos.x},${playerPos.y}`);

    while (true) {
        let nextX = playerPos.x + dx;
        let nextY = playerPos.y + dy;

        const state = `${nextX},${nextY}`;
        if (path.has(state)) {
            gameOver("무한 루프 함정에 빠졌습니다!");
            break;
        }
        path.add(state);

        // 점수 계산: 빈칸 -> 빈칸 이동은 점수 없음
        const currentTileDir = getTile(playerPos.x, playerPos.y);
        const nextTileDir = getTile(nextX, nextY);
        
        playerPos.x = nextX;
        playerPos.y = nextY;

        // 화살표 위에 있거나, 화살표를 타고 이동 중일 때만 점수 획득
        if (currentTileDir !== null || nextTileDir !== null) {
            score++;
            updateScore();
        }
        
        renderView();

        const arrow = getTile(playerPos.x, playerPos.y);
        if (!arrow) break; // 빈칸 도착 시 정지

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
    playerPos = { x: 0, y: 0 };
    mazeMap.clear();
    ensurePathFromStart(); // 탈출구 생성
    isGameOver = false;
    isMoving = false;
    updateScore();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    boardContainer.classList.remove('overlay-active');
    renderView();
}

// 초기 보드 보여주기
renderView();

// 이벤트 리스너
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
