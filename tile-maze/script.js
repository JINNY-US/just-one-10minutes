// Tile Maze 게임 로직
const GRID_SIZE = 11;
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

let score = 0;
let bestScore = localStorage.getItem('tile-maze-best') || 0;
let playerPos = { x: 5, y: 5 };
let mazeData = []; // 타일 데이터 (null | 'up' | 'down' | 'left' | 'right')
let isGameOver = false;
let isMoving = false;

bestScoreElement.textContent = `Best: ${bestScore}`;

// 맵 초기화 및 생성
function initMaze() {
    gameBoard.innerHTML = '';
    mazeData = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.x = x;
            tile.dataset.y = y;
            
            // 중앙 3x3 구역은 화살표가 생기지 않도록 하여 시작 방어
            if (Math.abs(x - 5) > 1 || Math.abs(y - 5) > 1) {
                // 30% 확률로 화살표 배치
                if (Math.random() < 0.3) {
                    const directions = ['up', 'down', 'left', 'right'];
                    const dir = directions[Math.floor(Math.random() * directions.length)];
                    mazeData[y][x] = dir;
                    tile.classList.add('arrow');
                    tile.textContent = getArrowChar(dir);
                }
            }
            gameBoard.appendChild(tile);
        }
    }
    updatePlayerPosition();
}

function getArrowChar(dir) {
    switch(dir) {
        case 'up': return '↑';
        case 'down': return '↓';
        case 'left': return '←';
        case 'right': return '→';
    }
}

// 플레이어 위치 업데이트
function updatePlayerPosition() {
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('player', 'visited'));
    const currentTile = document.querySelector(`.tile[data-x="${playerPos.x}"][data-y="${playerPos.y}"]`);
    if (currentTile) {
        currentTile.classList.add('player');
    }
}

// 이동 로직 (화살표 자동 이동 포함)
async function movePlayer(dx, dy) {
    if (isGameOver || isMoving) return;
    isMoving = true;

    let nextX = playerPos.x + dx;
    let nextY = playerPos.y + dy;
    let path = new Set(); // 무한 루프 탐지용

    while (true) {
        // 벽 충돌 검사
        if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
            gameOver("벽에 부딪혔습니다!");
            break;
        }

        playerPos.x = nextX;
        playerPos.y = nextY;
        score++;
        updateScore();
        updatePlayerPosition();

        // 현재 타일의 화살표 확인
        const arrow = mazeData[playerPos.y][playerPos.x];
        if (!arrow) {
            // 빈 타일이면 멈춤
            break;
        }

        // 루프 탐지
        const state = `${playerPos.x},${playerPos.y}`;
        if (path.has(state)) {
            gameOver("무한 루프 함정에 빠졌습니다!");
            break;
        }
        path.add(state);

        // 자동 이동 방향 설정
        let nextDx = 0, nextDy = 0;
        if (arrow === 'up') nextDy = -1;
        else if (arrow === 'down') nextDy = 1;
        else if (arrow === 'left') nextDx = -1;
        else if (arrow === 'right') nextDx = 1;

        nextX = playerPos.x + nextDx;
        nextY = playerPos.y + nextDy;

        // 시각적 효과를 위해 지연
        await new Promise(r => setTimeout(r, 100));
        if (isGameOver) break;
    }

    isMoving = false;
}

function updateScore() {
    scoreElement.textContent = `Score: ${score}`;
    if (score > bestScore) {
        bestScore = score;
        bestScoreElement.textContent = `Best: ${bestScore}`;
        localStorage.setItem('tile-maze-best', bestScore);
    }
}

function gameOver(reason) {
    isGameOver = true;
    isMoving = false;
    document.getElementById('game-over-title').textContent = reason;
    finalScoreElement.textContent = `Score: ${score}`;
    gameOverOverlay.classList.remove('hidden');
}

function startGame() {
    score = 0;
    playerPos = { x: 5, y: 5 };
    isGameOver = false;
    isMoving = false;
    updateScore();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    initMaze();
}

// 이벤트 리스너
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

window.addEventListener('keydown', (e) => {
    if (isGameOver || isMoving) return;
    switch(e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
    }
});
