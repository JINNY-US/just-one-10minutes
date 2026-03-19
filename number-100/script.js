const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const timerBar = document.getElementById('timer-bar');
const resetBtn = document.getElementById('reset-button');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
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

// 더욱 안정적인 오픈 소스 효과음 주소로 교체
const sounds = {
    start: new Audio('https://actions.google.com/sounds/v1/states-of-matter/pop_high.ogg'),
    select: new Audio('https://actions.google.com/sounds/v1/foley/sliding_whistle_up.ogg'),
    merge: new Audio('https://actions.google.com/sounds/v1/foley/button_click.ogg'),
    success: new Audio('https://actions.google.com/sounds/v1/cartoon/clirrup_whoosh.ogg'), // 100 완성 시 경쾌한 소리
    gameOver: new Audio('https://actions.google.com/sounds/v1/cartoon/conork_fail.ogg')
};

let score = 0;
let grid = []; 
let selectedTile = null;
const LIMIT_TIME = 120; 
let timeLeft = LIMIT_TIME;
let timerInterval;
let startTime = 0;

function initGame() {
    score = 0;
    timeLeft = LIMIT_TIME;
    startTime = Date.now();
    scoreDisplay.textContent = `Score: ${score}`;
    updateTimerDisplay();
    createGrid();
    renderBoard();
}

function getRandomNumber() {
    const elapsedTime = (Date.now() - startTime) / 1000;
    let val;
    if (Math.random() < 0.4) {
        val = Math.floor(Math.random() * 15) + 1;
    } else {
        let additionalRange = Math.min(elapsedTime * 0.3, 30);
        let maxRange = 20 + additionalRange; 
        val = Math.floor(Math.random() * maxRange) + 1;
    }
    return { value: val, moves: 0 };
}

function createGrid() {
    grid = [];
    for (let r = 0; r < 4; r++) {
        let row = [];
        for (let c = 0; c < 4; c++) {
            row.push(getRandomNumber());
        }
        grid.push(row);
    }
}

function renderBoard() {
    gameBoard.innerHTML = '';
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const tileData = grid[r][c];
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.textContent = tileData.value;
            tile.dataset.row = r;
            tile.dataset.col = c;
            
            if (selectedTile && selectedTile.r === r && selectedTile.c === c) {
                tile.classList.add('selected');
            }
            
            tile.onclick = () => handleTileClick(r, c);
            gameBoard.appendChild(tile);
        }
    }
}

function handleTileClick(r, c) {
    if (!timerInterval) return;

    if (!selectedTile) {
        selectedTile = { r, c };
        playSound(sounds.select);
        renderBoard();
    } else {
        const dr = Math.abs(selectedTile.r - r);
        const dc = Math.abs(selectedTile.c - c);

        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
            const tile1 = grid[selectedTile.r][selectedTile.c];
            const tile2 = grid[r][c];
            const sum = tile1.value + tile2.value;
            const totalMoves = tile1.moves + tile2.moves + 1;

            if (sum <= 100) {
                score += sum;

                if (sum === 100) {
                    playSound(sounds.success);
                    const bonus = Math.max(50, 250 - (totalMoves * 30));
                    score += bonus;
                    grid[selectedTile.r][selectedTile.c] = { value: 0, moves: 0 };
                    grid[r][c] = { value: 0, moves: 0 };
                    timeLeft = Math.min(timeLeft + 5, LIMIT_TIME);
                } else {
                    playSound(sounds.merge);
                    grid[r][c] = { value: sum, moves: totalMoves };
                    grid[selectedTile.r][selectedTile.c] = { value: 0, moves: 0 };
                }
                
                scoreDisplay.textContent = `Score: ${score}`;
                applyGravity();
                selectedTile = null;
                renderBoard();
            } else {
                selectedTile = { r, c };
                playSound(sounds.select);
                renderBoard();
            }
        } else {
            selectedTile = { r, c };
            playSound(sounds.select);
            renderBoard();
        }
    }
}

// 소리 재생 함수 (중복 재생 및 에러 방지)
function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Sound play prevented:", e));
}

function applyGravity() {
    for (let c = 0; c < 4; c++) {
        let emptySpaces = 0;
        for (let r = 3; r >= 0; r--) {
            if (grid[r][c].value === 0) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                grid[r + emptySpaces][c] = grid[r][c];
                grid[r][c] = { value: 0, moves: 0 };
            }
        }
        for (let r = 0; r < emptySpaces; r++) {
            grid[r][c] = getRandomNumber();
        }
    }
}

function updateTimerDisplay() {
    const widthPercent = (timeLeft / LIMIT_TIME) * 100;
    timerBar.style.width = `${widthPercent}%`;
    if (timeLeft < 20) { 
        timerBar.style.backgroundColor = "#ff0000";
    } else {
        timerBar.style.backgroundColor = "#e74c3c";
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            playSound(sounds.gameOver);
            alert(`게임 종료! 최종 점수: ${score}`);
            startOverlay.style.display = 'flex';
        }
    }, 100);
}

startBtn.onclick = () => {
    // [중요] 모든 효과음의 '잠금 해제' (유저 클릭 시점에 load 호출)
    Object.values(sounds).forEach(s => {
        s.load();
        s.muted = true; // 무음 재생으로 세션 활성화
        s.play().then(() => {
            s.pause();
            s.muted = false;
            s.currentTime = 0;
        });
    });

    setTimeout(() => {
        playSound(sounds.start);
        startOverlay.style.display = 'none';
        initGame();
        startTimer();
    }, 100);
};

resetBtn.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    startOverlay.style.display = 'flex';
    initGame();
};

initGame();
updateTimerDisplay();
