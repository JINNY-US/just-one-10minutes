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
const speedBtn = document.getElementById('speed-btn');
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

let score = 0;
let playerPos = { x: 0, y: 3 }; 
let mazeMap = new Map(); 
let pathExitY = 3; // 이전 열에서 정답 경로가 도달한 Y 좌표
let isGameOver = false;
let isMoving = false;

// 속도 조절 변수
let speedLevel = 1; 
const speedDelays = { 1: 300, 2: 150, 3: 100 };

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
        pathExitY = Math.floor(Math.random() * VIEW_H);
        return;
    }

    // 이번 열의 정답 경로 생성
    const entranceY = pathExitY;
    const targetY = Math.floor(Math.random() * VIEW_H); // 이번 열에서 오른쪽으로 나갈 Y 좌표
    let columnPathKeys = new Set();

    // entranceY에서 targetY까지 수동으로 이동해야 하는 구간을 빈칸(null)으로 설정
    let tempY = entranceY;
    while (true) {
        mazeMap.set(`${x},${tempY}`, null);
        columnPathKeys.add(`${x},${tempY}`);
        if (tempY === targetY) break;
        tempY += (targetY > tempY ? 1 : -1);
    }

    // targetY 위치에 오른쪽 전진 화살표 배치 (단, 5열마다 한번은 멈추게 null 배치)
    const isStopTile = (x % 5 === 0);
    if (!isStopTile) {
        mazeMap.set(`${x},targetY_placeholder`, 'right'); // 아래에서 실제 좌표로 치환
        mazeMap.set(`${x},${targetY}`, 'right');
    } else {
        mazeMap.set(`${x},${targetY}`, null);
    }
    columnPathKeys.add(`${x},${targetY}`);
    pathExitY = targetY; // 다음 열을 위한 출구 좌표 저장

    // 나머지 타일은 함정 화살표로 채움
    for (let y = 0; y < VIEW_H; y++) {
        const key = `${x},${y}`;
        if (columnPathKeys.has(key)) continue;

        // 함정: 주로 루프를 만들거나 벽으로 보냄
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

        playerPos.x = nextX;
        playerPos.y = nextY;

        // 점수 산정: 새로운 열에 도달했을 때만 갱신
        if (playerPos.x > score) {
            score = playerPos.x;
            updateScore();
        }
        
        renderView();

        const arrow = mazeMap.get(`${playerPos.x},${playerPos.y}`);
        if (!arrow) break; // 빈칸 도착 (수동 조작 필요)

        if (arrow === 'up') { dx = 0; dy = -1; }
        else if (arrow === 'down') { dx = 0; dy = 1; }
        else if (arrow === 'left') { dx = -1; dy = 0; }
        else if (arrow === 'right') { dx = 1; dy = 0; }

        await new Promise(r => setTimeout(r, speedDelays[speedLevel]));
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

function toggleSpeed() {
    speedLevel = (speedLevel % 3) + 1;
    const arrows = "▷".repeat(speedLevel);
    speedBtn.textContent = `Speed: ${arrows}`;
}

// 스와이프 제어 변수
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    if (isGameOver || isMoving || !startOverlay.classList.contains('hidden')) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    const minSwipeDistance = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > minSwipeDistance) {
            if (dx > 0) movePlayer(1, 0);
            else movePlayer(-1, 0);
        }
    } else {
        if (Math.abs(dy) > minSwipeDistance) {
            if (dy > 0) movePlayer(0, 1);
            else movePlayer(0, -1);
        }
    }
}

// 초기 보드 보여주기
renderView();

// 이벤트 리스너 등록
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', startGame);
speedBtn.addEventListener('click', toggleSpeed);

boardContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
boardContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
boardContainer.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
}, { passive: false });

window.addEventListener('keydown', (e) => {
    if (isGameOver || isMoving || !startOverlay.classList.contains('hidden')) return;
    switch(e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
    }
});
