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
const timerBar = document.getElementById('timer-bar');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const startOverlay = document.getElementById('start-overlay');

// 초기화 (페이지 로드 시 호출)
function initGame() {
    score = 0;
    combo = 0;
    timeLeft = GAME_TIME;
    scoreDisplay.textContent = score;
    updateTimerBar();
    selectedTile = null;
    isAnimating = false;
    
    createBoard();
    updateBoard(); // 생성된 보드를 화면에 반영
    startOverlay.classList.remove('hidden');
    if (timerId) clearInterval(timerId);
}

// 보드 생성 (초기 매치 방지 및 이동 가능성 보장)
function createBoard() {
    let hasMove = false;
    while (!hasMove) {
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
        hasMove = hasPossibleMoves();
    }
}

// 타일 클릭 이벤트
async function onTileClick(e) {
    if (isAnimating || timeLeft <= 0 || !startOverlay.classList.contains('hidden')) return;
    
    const tile = e.target;
    const r = parseInt(tile.dataset.r);
    const c = parseInt(tile.dataset.c);
    
    if (selectedTile) {
        const prevR = parseInt(selectedTile.dataset.r);
        const prevC = parseInt(selectedTile.dataset.c);
        
        if (isAdjacent(prevR, prevC, r, c)) {
            await swapTiles(prevR, prevC, r, c);
            if (selectedTile) selectedTile.classList.remove('selected');
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
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE - 2; c++) {
            const color = grid[r][c];
            if (color !== null && grid[r][c+1] === color && grid[r][c+2] === color) {
                matches.push({r, c}, {r, c: c+1}, {r, c: c+2});
            }
        }
    }
    for (let c = 0; c < SIZE; c++) {
        for (let r = 0; r < SIZE - 2; r++) {
            const color = grid[r][c];
            if (color !== null && grid[r+1][c] === color && grid[r+2][c] === color) {
                matches.push({r, c}, {r: r+1, c}, {r: r+2, c});
            }
        }
    }
    return matches.filter((v, i, a) => a.findIndex(t => t.r === v.r && t.c === v.c) === i);
}

// 매치 해결 및 낙하
async function resolveMatches() {
    const matches = findMatches();
    if (matches.length === 0) {
        combo = 0;
        if (!hasPossibleMoves()) {
            setTimeout(() => {
                alert("더 이상 움직일 수 있는 타일이 없어 보드를 다시 섞습니다!");
                createBoard();
                updateBoard();
            }, 500);
        }
        return;
    }
    
    combo++;
    const points = matches.length * 10 * combo;
    score += points;
    scoreDisplay.textContent = score;
    
    matches.forEach(m => {
        const tile = gameBoard.children[m.r * SIZE + m.c];
        tile.classList.add('matching');
    });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    matches.forEach(m => grid[m.r][m.c] = null);
    
    dropTiles();
    updateBoard();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    await resolveMatches();
}

function hasPossibleMoves() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (c < SIZE - 1 && checkSwapProducesMatch(r, c, r, c + 1)) return true;
            if (r < SIZE - 1 && checkSwapProducesMatch(r, c, r + 1, c)) return true;
        }
    }
    return false;
}

function checkSwapProducesMatch(r1, c1, r2, c2) {
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
    const matches = findMatches();
    const temp2 = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp2;
    return matches.length > 0;
}

function dropTiles() {
    for (let c = 0; c < SIZE; c++) {
        let emptyRows = [];
        for (let r = SIZE - 1; r >= 0; r--) {
            if (grid[r][c] === null) emptyRows.push(r);
            else if (emptyRows.length > 0) {
                const targetR = emptyRows.shift();
                grid[targetR][c] = grid[r][c];
                grid[r][c] = null;
                emptyRows.push(r);
            }
        }
        emptyRows.forEach(r => grid[r][c] = Math.floor(Math.random() * COLORS));
    }
}

function updateBoard() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const tile = gameBoard.children[r * SIZE + c];
            const color = grid[r][c];
            tile.className = `tile c${color}`;
            tile.style.opacity = (color === null) ? '0' : '1';
        }
    }
}

function updateTimerBar() {
    const percentage = (timeLeft / GAME_TIME) * 100;
    timerBar.style.width = Math.max(0, percentage) + '%';
}

function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft -= 0.1;
        updateTimerBar();
        if (timeLeft <= 0) endGame();
    }, 100);
}

function endGame() {
    clearInterval(timerId);
    alert(`게임 종료! 최종 점수: ${score}점`);
    initGame();
}

function startGame() {
    startOverlay.classList.add('hidden');
    startTimer();
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', initGame);

// 초기 보드 생성 및 표시
initGame();