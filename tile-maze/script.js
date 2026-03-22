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
let playerPos = { x: 0, y: 3 }; // 왼쪽 중앙 시작
let mazeMap = new Map(); // "x,y" => direction
let correctPath = []; // [{x, y}, ...]
let isGameOver = false;
let isMoving = false;

// 초기 상태: 블러 처리
boardContainer.classList.add('overlay-active');

// 타일 생성 및 정답 경로 보장 로직
function generateColumn(x) {
    // 이미 생성된 열이면 통과
    if (mazeMap.has(`${x},0`)) return;

    if (x === 0) {
        // 첫 번째 줄은 모두 빈칸 (어디서 시작할지 선택)
        for (let y = 0; y < VIEW_H; y++) {
            mazeMap.set(`${x},${y}`, null);
        }
        // 정답 경로의 시작점 결정 (랜덤하게 하나 선택)
        const startY = Math.floor(Math.random() * VIEW_H);
        correctPath = [{ x: 0, y: startY }];
    } else {
        const lastStep = correctPath[correctPath.length - 1];
        
        // 정답 경로 타일 결정 (이전 위치에서 위, 아래, 또는 오른쪽)
        const possibleY = [lastStep.y];
        if (lastStep.y > 0) possibleY.push(lastStep.y - 1);
        if (lastStep.y < VIEW_H - 1) possibleY.push(lastStep.y + 1);
        
        const nextY = possibleY[Math.floor(Math.random() * possibleY.length)];
        const nextStep = { x: x, y: nextY };
        
        // 이전 정답 타일의 화살표 방향 설정 (현재 정답 타일을 가리키게 함)
        let dirToNext = 'right';
        if (nextStep.y < lastStep.y) dirToNext = 'up';
        else if (nextStep.y > lastStep.y) dirToNext = 'down';
        
        mazeMap.set(`${lastStep.x},${lastStep.y}`, dirToNext);
        correctPath.push(nextStep);

        // 나머지 타일들은 함정으로 채움
        for (let y = 0; y < VIEW_H; y++) {
            const key = `${x},${y}`;
            if (mazeMap.has(key)) continue; // 정답 경로는 건너뜀

            const trapRoll = Math.random();
            if (trapRoll < 0.1) {
                mazeMap.set(key, null); // 10% 확률로 멈추는 칸
            } else {
                // 함정 방향: 루프를 위해 왼쪽으로 보내거나, 벽(위/아래)으로 보냄
                const trapDirs = ['left', 'up', 'down'];
                // 가끔 오른쪽으로 보내더라도 결국 루프로 이어지게 함
                mazeMap.set(key, trapDirs[Math.floor(Math.random() * trapDirs.length)]);
            }
        }
    }
}

// 뷰포트 렌더링 (플레이어의 x가 변하면 화면도 따라감)
function renderView() {
    gameBoard.innerHTML = '';
    // 플레이어가 화면 중앙 근처에 오도록 보정 (또는 왼쪽 고정 확장)
    const scrollX = Math.max(0, playerPos.x - 5);

    for (let y = 0; y < VIEW_H; y++) {
        for (let x = scrollX; x < scrollX + VIEW_W; x++) {
            // 보이지 않는 열 자동 생성
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

        // 벽 충돌 검사 (세로 범위 밖)
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
        score++;
        updateScore();
        renderView();

        const arrow = mazeMap.get(`${playerPos.x},${playerPos.y}`);
        if (!arrow) break; // 정지 칸 도착

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
    correctPath = [];
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
