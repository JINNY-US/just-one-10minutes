const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const resetButton = document.getElementById('reset-button');

const TILES_COUNT = 16; 
let sequence = [];
let playerSequence = [];
let score = 0;
let canClick = false;
let timeoutId;
let timeLeft = 10; // 초기 제한 시간
let timerInterval;

function initializeBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < TILES_COUNT; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.id = i;
        tile.addEventListener('click', handleTileClick);
        gameBoard.appendChild(tile);
    }
}

function startTimer() {
    clearInterval(timerInterval);
    // 스테이지가 올라갈 때마다 추가 시간을 줌 (기본 10초 + 시퀀스 길이 당 1초)
    timeLeft = 10 + sequence.length;
    timerDisplay.textContent = `남은 시간: ${timeLeft}초`;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `남은 시간: ${timeLeft}초`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert(`시간 초과! 게임 오버! 점수: ${score}`);
            resetGame();
        }
    }, 1000);
}

function startRound() {
    canClick = false;
    playerSequence = [];
    scoreDisplay.textContent = `Score: ${score}`;
    timerDisplay.textContent = `준비하세요!`;
    clearInterval(timerInterval); // 시퀀스 보여주는 동안에는 타이머 멈춤

    const randomTile = Math.floor(Math.random() * TILES_COUNT);
    sequence.push(randomTile);

    setTimeout(displaySequence, 500); // 0.5초 대기 후 시작
}

function displaySequence() {
    let i = 0;
    const tiles = document.querySelectorAll('.tile');

    function showNextTile() {
        if (i < sequence.length) {
            const tileId = sequence[i];
            const tile = tiles[tileId];

            tile.classList.add('active');
            setTimeout(() => {
                tile.classList.remove('active');
                i++;
                timeoutId = setTimeout(showNextTile, 500);
            }, 500);
        } else {
            canClick = true;
            startTimer(); // 시퀀스 보기가 끝나면 타이머 시작
        }
    }
    showNextTile();
}

function handleTileClick(event) {
    if (!canClick) return;

    const clickedTileId = parseInt(event.target.dataset.id);
    playerSequence.push(clickedTileId);

    event.target.classList.add('active');
    setTimeout(() => {
        event.target.classList.remove('active');
    }, 200);

    checkPlayerSequence();
}

function checkPlayerSequence() {
    const lastClickedIndex = playerSequence.length - 1;

    if (playerSequence[lastClickedIndex] !== sequence[lastClickedIndex]) {
        gameOver();
        return;
    }

    if (playerSequence.length === sequence.length) {
        score++;
        scoreDisplay.textContent = `Score: ${score}`;
        canClick = false;
        clearInterval(timerInterval); // 정답 시 타이머 멈춤
        clearTimeout(timeoutId);
        setTimeout(startRound, 1000);
    }
}

function gameOver() {
    clearInterval(timerInterval);
    clearTimeout(timeoutId);
    canClick = false;
    alert(`Game Over! Your score: ${score}`);
    resetGame();
}

function resetGame() {
    clearInterval(timerInterval);
    sequence = [];
    playerSequence = [];
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    timerDisplay.textContent = `남은 시간: 10초`;
    clearTimeout(timeoutId);
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => tile.classList.add('wrong'));
    setTimeout(() => {
        tiles.forEach(tile => tile.classList.remove('wrong'));
        startRound();
    }, 1000);
}

resetButton.addEventListener('click', resetGame);

initializeBoard();
startRound();
