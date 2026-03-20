const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetButton = document.getElementById('reset-button');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');

const TILES_COUNT = 16; 
let sequence = [];
let playerSequence = [];
let score = 0;
let canClick = false;
let timeoutId;
let timeLeft = 10;
let maxTime = 10;
let timerInterval;
const toggle = document.getElementById("darkModeToggle");

// 저장된 상태 불러오기
if (localStorage.getItem("darkMode") === "on") {
  document.body.classList.add("dark");
  toggle.checked = true;
}

// 토글 이벤트
toggle.addEventListener("change", () => {
  if (toggle.checked) {
    document.body.classList.add("dark");
    localStorage.setItem("darkMode", "on");
  } else {
    document.body.classList.remove("dark");
    localStorage.setItem("darkMode", "off");
  }
});

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

function updateTimerDisplay() {
    const widthPercent = (timeLeft / maxTime) * 100;
    timerBar.style.width = `${widthPercent}%`;
}

function startTimer() {
    clearInterval(timerInterval);
    maxTime = 10 + sequence.length;
    timeLeft = maxTime;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert(`시간 초과! 게임 오버! 점수: ${score}`);
            resetGame();
        }
    }, 100);
}

function startRound() {
    canClick = false;
    playerSequence = [];
    scoreDisplay.textContent = `Score: ${score}`;
    timerBar.style.width = '100%';
    clearInterval(timerInterval);

    const randomTile = Math.floor(Math.random() * TILES_COUNT);
    sequence.push(randomTile);

    setTimeout(displaySequence, 500);
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
            startTimer();
        }
    }
    showNextTile();
}

function handleTileClick(event) {
    if (!canClick) return;

    const clickedTileId = parseInt(event.target.dataset.id);
    playerSequence.push(clickedTileId);

    const isCorrect = playerSequence[playerSequence.length - 1] === sequence[playerSequence.length - 1];
    
    if (isCorrect) {
        event.target.classList.add('active');
        setTimeout(() => {
            event.target.classList.remove('active');
        }, 200);
    } else {
        event.target.classList.add('wrong');
        setTimeout(() => {
            event.target.classList.remove('wrong');
        }, 500);
    }

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
        clearInterval(timerInterval);
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
    timerBar.style.width = '100%';
    startOverlay.style.display = 'flex'; // 시작 버튼 다시 표시
}

startBtn.onclick = () => {
    startOverlay.style.display = 'none';
    initializeBoard();
    startRound();
};

resetButton.addEventListener('click', resetGame);

// 초기 보드 세팅만 해둠
initializeBoard();


