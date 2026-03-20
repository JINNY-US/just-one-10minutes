const BOARD_WIDTH = 17;
const BOARD_HEIGHT = 11;
const GAME_TIME = 120; // 2분 (초)

let score = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let isDragging = false;
let isGameActive = false;
let startX, startY;
let tiles = [];

const gameBoard = document.getElementById('game-board');
const selectionBox = document.getElementById('selection-box');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const overlay = document.getElementById('overlay');
const finalScoreDisplay = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const startOverlay = document.getElementById('start-overlay');

// 초기화
function initGame() {
    score = 0;
    timeLeft = GAME_TIME;
    scoreDisplay.textContent = score;
    updateTimerBar();
    createBoard();
    overlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    isGameActive = false;
    startBtn.disabled = false;
}

// 보드 생성
function createBoard() {
    gameBoard.innerHTML = '';
    tiles = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
            const val = Math.floor(Math.random() * 9) + 1;
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = val;
            tile.dataset.value = val;
            gameBoard.appendChild(tile);
            tiles.push(tile);
        }
    }

    // 노란 토마토 10개 랜덤 배치
    let yellowCount = 0;
    while (yellowCount < 10) {
        const randomIndex = Math.floor(Math.random() * tiles.length);
        if (!tiles[randomIndex].classList.contains('yellow')) {
            tiles[randomIndex].classList.add('yellow');
            yellowCount++;
        }
    }
}

// 게임 시작
function startGame() {
    if (isGameActive) return;
    isGameActive = true;
    startBtn.disabled = true;
    startOverlay.classList.add('hidden');
    
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft -= 0.1; // 0.1초 단위로 부드럽게 감소
        updateTimerBar();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 100);
}

function updateTimerBar() {
    const percentage = (timeLeft / GAME_TIME) * 100;
    timerBar.style.width = Math.max(0, percentage) + '%';
}

function endGame() {
    clearInterval(timerId);
    isGameActive = false;
    alert(`게임 종료! 최종 점수: ${score}점`);
    initGame();
}

function resetGame() {
    clearInterval(timerId);
    initGame();
    startGame();
}

// 이벤트 리스너 등록
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

// 드래그 로직
const boardWrapper = document.querySelector('.board-wrapper');

function handleStart(e) {
    if (!isGameActive) return;
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = boardWrapper.getBoundingClientRect();
    startX = clientX - rect.left;
    startY = clientY - rect.top;
    
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.classList.remove('hidden');
}

function handleMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = boardWrapper.getBoundingClientRect();
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    if (e.touches) e.preventDefault();
}

function handleEnd() {
    if (!isDragging) return;
    isDragging = false;
    
    // 박스가 사라지기 전에 영역 내 타일 체크
    checkSelection();
    selectionBox.classList.add('hidden');
}

boardWrapper.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

boardWrapper.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('touchend', handleEnd);

// 선택된 영역 확인
function checkSelection() {
    // selectionBox가 hidden이 아니어야 getBoundingClientRect가 정상 작동함
    const boxRect = selectionBox.getBoundingClientRect();
    let sum = 0;
    let selectedTiles = [];

    tiles.forEach(tile => {
        if (tile.classList.contains('empty')) return;
        
        const tileRect = tile.getBoundingClientRect();
        const centerX = tileRect.left + tileRect.width / 2;
        const centerY = tileRect.top + tileRect.height / 2;

        if (centerX >= boxRect.left && centerX <= boxRect.right &&
            centerY >= boxRect.top && centerY <= boxRect.bottom) {
            sum += parseInt(tile.dataset.value);
            selectedTiles.push(tile);
        }
    });

    if (sum === 10 && selectedTiles.length > 0) {
        let roundScore = selectedTiles.length;
        
        selectedTiles.forEach(tile => {
            if (tile.classList.contains('yellow')) {
                roundScore += 4; // 노란 토마토 개당 +4점
            }
            tile.classList.add('empty');
            tile.classList.remove('yellow'); // 상태 초기화
        });
        
        score += roundScore;
        scoreDisplay.textContent = score;
    }
}

// 초기 실행
initGame();