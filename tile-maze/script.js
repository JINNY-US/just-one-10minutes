// Tile Maze - 무한 확장 슬라이딩 미로 로직
const VIEW_SIZE = 11; // 화면에 보이는 격자 크기 (11x11)
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
let playerPos = { x: 0, y: 0 }; // 실제 좌표 (0,0 시작)
let mazeMap = new Map(); // "x,y" => direction (null, 'up', 'down', 'left', 'right')
let isGameOver = false;
let isMoving = false;

bestScoreElement.textContent = `Best: ${bestScore}`;

// 타일 정보 가져오기 또는 생성 (Lazy Generation)
function getTile(x, y) {
    const key = `${x},${y}`;
    if (!mazeMap.has(key)) {
        // 시작 지점(0,0) 주변은 무조건 빈칸으로 시작
        if (Math.abs(x) <= 1 && Math.abs(y) <= 1) {
            mazeMap.set(key, null);
        } else {
            // 1% 확률로 빈칸(null), 99% 확률로 화살표
            const isStopTile = Math.random() < 0.01;
            if (isStopTile) {
                mazeMap.set(key, null);
            } else {
                const directions = ['up', 'down', 'left', 'right'];
                // 함정 확률을 높이기 위해 무작위 방향 설정
                const dir = directions[Math.floor(Math.random() * directions.length)];
                mazeMap.set(key, dir);
            }
        }
    }
    return mazeMap.get(key);
}

// 화면 렌더링 (플레이어 중심 11x11 뷰포트)
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
                tile.classList.add('empty-tile'); // 빈칸 타일 시각적 구분
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

// 이동 로직 (슬라이딩 처리)
async function movePlayer(dx, dy) {
    if (isGameOver || isMoving) return;
    isMoving = true;

    let path = new Set(); // 루프 탐지용 (현재 이동 시퀀스 내)
    let movedInSequence = 0;

    while (true) {
        let nextX = playerPos.x + dx;
        let nextY = playerPos.y + dy;

        // 루프 탐지 (같은 좌표를 같은 이동 시퀀스에서 다시 밟음)
        const state = `${nextX},${nextY}`;
        if (path.has(state)) {
            gameOver("무한 루프 함정에 빠졌습니다!");
            break;
        }
        path.add(state);

        // 플레이어 위치 업데이트
        playerPos.x = nextX;
        playerPos.y = nextY;
        score++;
        movedInSequence++;
        updateScore();
        renderView();

        // 현재 타일의 성질 확인
        const arrow = getTile(playerPos.x, playerPos.y);
        if (!arrow) {
            // 빈칸 타일 도착 -> 정지
            break;
        }

        // 화살표 방향으로 dx, dy 업데이트
        if (arrow === 'up') { dx = 0; dy = -1; }
        else if (arrow === 'down') { dx = 0; dy = 1; }
        else if (arrow === 'left') { dx = -1; dy = 0; }
        else if (arrow === 'right') { dx = 1; dy = 0; }

        // 자동 이동 시각 효과를 위한 지연
        await new Promise(r => setTimeout(r, 60));
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
    playerPos = { x: 0, y: 0 };
    mazeMap.clear();
    isGameOver = false;
    isMoving = false;
    updateScore();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    renderView();
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
