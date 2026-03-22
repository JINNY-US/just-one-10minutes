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
let pathExitY = 3; 
let isGameOver = false;
let isMoving = false;

// 속도 조절 변수
let speedLevel = 1; // 1, 2, 3
const speedDelays = { 1: 300, 2: 150, 3: 100 };

// 초기 상태: 블러 처리
boardContainer.classList.add('overlay-active');

// 타일 생성 로직
function generateColumn(x) {
    if (mazeMap.has(`${x},0`)) return;

    if (x === 0) {
        for (let y = 0; y < VIEW_H; y++) {
            mazeMap.set(`${x},${y}`, null);
        }
        pathExitY = Math.floor(Math.random() * VIEW_H);
        return;
    }

    const entranceY = pathExitY;
    let currentY = entranceY;
    let columnPathKeys = new Set();

    if (Math.random() < 0.6) {
        const moveCount = Math.floor(Math.random() * 2) + 1; 
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

    const isStopColumn = (x % 4 === 0);
    if (isStopColumn) {
        mazeMap.set(`${x},${currentY}`, null); 
    } else {
        mazeMap.set(`${x},${currentY}`, 'right'); 
    }
    columnPathKeys.add(`${x},${currentY}`);
    pathExitY = currentY; 

    for (let y = 0; y < VIEW_H; y++) {
        const key = `${x},${y}`;
        if (columnPathKeys.has(key)) continue;

        const trapRoll = Math.random();
        if (trapRoll < 0.05) {
            mazeMap.set(key, null); 
        } else {
            const trapDirs = ['up', 'down', 'left', 'right'];
            const dir = trapDirs[Math.floor(Math.random() * trapDirs.length)];
            mazeMap.set(key, dir);
        }
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

        score = Math.max(score, playerPos.x);
        updateScore();
        
        renderView();

        const arrow = mazeMap.get(`${playerPos.x},${playerPos.y}`);
        if (!arrow) break; 

        if (arrow === 'up') { dx = 0; dy = -1; }
        else if (arrow === 'down') { dx = 0; dy = 1; }
        else if (arrow === 'left') { dx = -1; dy = 0; }
        else if (arrow === 'right') { dx = 1; dy = 0; }

        // 현재 설정된 속도(지연 시간) 적용
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

// 속도 변경 로직
function toggleSpeed() {
    speedLevel = (speedLevel % 3) + 1;
    const arrows = "▷".repeat(speedLevel);
    speedBtn.textContent = `Speed: ${arrows}`;
// 초기 보드 보여주기 (블러 상태로)
renderView();

// 스와이프 제어 변수
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    if (isGameOver || isMoving || startOverlay.offsetParent !== null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // 최소 스와이프 거리 (픽셀)
    const minSwipeDistance = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
        // 가로 스와이프
        if (Math.abs(dx) > minSwipeDistance) {
            if (dx > 0) movePlayer(1, 0); // 오른쪽
            else movePlayer(-1, 0); // 왼쪽
        }
    } else {
        // 세로 스와이프
        if (Math.abs(dy) > minSwipeDistance) {
            if (dy > 0) movePlayer(0, 1); // 아래
            else movePlayer(0, -1); // 위
        }
    }
}

// 이벤트 리스너
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', startGame);
speedBtn.addEventListener('click', toggleSpeed);

// 터치 이벤트 등록
gameBoard.addEventListener('touchstart', handleTouchStart, { passive: false });
gameBoard.addEventListener('touchend', handleTouchEnd, { passive: false });
// 스크롤 방지
gameBoard.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('keydown', (e) => {

    if (isGameOver || isMoving || !startOverlay.classList.contains('hidden')) return;
    switch(e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
    }
});
