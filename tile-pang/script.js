const SIZE = 7;
const COLORS = 7;
const GAME_TIME = 60;

let grid = [];
let score = 0;
let combo = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let isAnimating = false;
let selectedTile = null;

const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo');
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const modalResetBtn = document.getElementById('modal-reset-btn');
const startOverlay = document.getElementById('start-overlay');
const overlay = document.getElementById('overlay');
const finalScoreDisplay = document.getElementById('final-score');

// 초기화
function initGame() {
    score = 0;
    combo = 0;
    timeLeft = GAME_TIME;
    scoreDisplay.textContent = score;
    comboDisplay.textContent = combo;
    timerDisplay.textContent = timeLeft;
    selectedTile = null;
    isAnimating = false;
    
    createBoard();
    overlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    if (timerId) clearInterval(timerId);
}

// 보드 생성 (초기 매치 방지)
function createBoard() {
    grid = [];
    gameBoard.innerHTML = '';
    
    for (let r = 0; r < SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < SIZE; c++) {
            let color;
            do {
                color = Math.floor(Math.random() * COLORS);
            } while (
                (c >= 2 && grid[r][c-1] === color && grid[r][c-2] === color) ||
                (r >= 2 && grid[r-1][c] === color && grid[r-2][c] === color)
            );
            grid[r][c] = color;
            
            const tile = document.createElement('div');
            tile.className = `tile c${color}`;
            tile.dataset.r = r;
            tile.dataset.c = c;
            tile.addEventListener('click', onTileClick);
            gameBoard.appendChild(tile);
        }
    }
}

// 타일 클릭 이벤트
async function onTileClick(e) {
    if (isAnimating || timeLeft <= 0) return;
    
    const tile = e.target;
    const r = parseInt(tile.dataset.r);
    const c = parseInt(tile.dataset.c);
    
    if (selectedTile) {
        const prevR = parseInt(selectedTile.dataset.r);
        const prevC = parseInt(selectedTile.dataset.c);
        
        if (isAdjacent(prevR, prevC, r, c)) {
            await swapTiles(prevR, prevC, r, c);
            selectedTile.classList.remove('selected');
            selectedTile = null;
        } else {
            selectedTile.classList.remove('selected');
            selectedTile = tile;
            tile.classList.add('selected');
        }
    } else {
        selectedTile = tile;
        tile.classList.add('selected');
    }
}

function isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

// 타일 교체 및 매치 확인
async function swapTiles(r1, c1, r2, c2) {
    isAnimating = true;
    
    // 데이터 교체
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
    
    updateBoard();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const matches = findMatches();
    if (matches.length > 0) {
        combo = 0;
        await resolveMatches();
    } else {
        // 매치가 없으면 다시 되돌리기
        const tempBack = grid[r1][c1];
        grid[r1][c1] = grid[r2][c2];
        grid[r2][c2] = tempBack;
        updateBoard();
    }
    
    isAnimating = false;
}

// 매치 찾기
function findMatches() {
    let matches = [];
    
    // 가로 매치
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE - 2; c++) {
            const color = grid[r][c];
            if (color !== null && grid[r][c+1] === color && grid[r][c+2] === color) {
                matches.push({r, c}, {r, c: c+1}, {r, c: c+2});
            }
        }
    }
    
    // 세로 매치
    for (let c = 0; c < SIZE; c++) {
        for (let r = 0; r < SIZE - 2; r++) {
            const color = grid[r][c];
            if (color !== null && grid[r+1][c] === color && grid[r+2][c] === color) {
                matches.push({r, c}, {r: r+1, c}, {r: r+2, c});
            }
        }
    }
    
    // 중복 제거
    return matches.filter((v, i, a) => a.findIndex(t => t.r === v.r && t.c === v.c) === i);
}

// 매치 해결 및 낙하 (재귀적 콤보 처리)
async function resolveMatches() {
    const matches = findMatches();
    if (matches.length === 0) {
        combo = 0;
        comboDisplay.textContent = combo;
        return;
    }
    
    combo++;
    comboDisplay.textContent = combo;
    
    // 점수 계산 (콤보 보너스: 기본 점수 * 콤보)
    const points = matches.length * 10 * combo;
    score += points;
    scoreDisplay.textContent = score;
    
    // 애니메이션 표시
    matches.forEach(m => {
        const tile = gameBoard.children[m.r * SIZE + m.c];
        tile.classList.add('matching');
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 타일 제거
    matches.forEach(m => {
        grid[m.r][m.c] = null;
    });
    
    // 낙하 처리
    dropTiles();
    updateBoard();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 재귀적으로 다음 매치 확인 (콤보)
    await resolveMatches();
}

function dropTiles() {
    for (let c = 0; c < SIZE; c++) {
        let emptyRows = [];
        for (let r = SIZE - 1; r >= 0; r--) {
            if (grid[r][c] === null) {
                emptyRows.push(r);
            } else if (emptyRows.length > 0) {
                const targetR = emptyRows.shift();
                grid[targetR][c] = grid[r][c];
                grid[r][c] = null;
                emptyRows.push(r);
            }
        }
        
        // 새 타일 생성
        emptyRows.forEach(r => {
            grid[r][c] = Math.floor(Math.random() * COLORS);
        });
    }
}

function updateBoard() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const tile = gameBoard.children[r * SIZE + c];
            const color = grid[r][c];
            tile.className = `tile c${color}`;
            if (color === null) tile.style.opacity = '0';
            else tile.style.opacity = '1';
        }
    }
}

// 게임 타이머
function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    clearInterval(timerId);
    finalScoreDisplay.textContent = score;
    overlay.classList.remove('hidden');
}

function startGame() {
    initGame();
    startOverlay.classList.add('hidden');
    startTimer();
}

// 이벤트 바인딩
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', () => {
    initGame();
    startGame();
});
modalResetBtn.addEventListener('click', () => {
    initGame();
    startGame();
});

// 초기 보드 생성
initGame();