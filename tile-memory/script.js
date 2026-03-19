const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const resetButton = document.getElementById('reset-button');

const TILES_COUNT = 16; 
let sequence = [];
let playerSequence = [];
let score = 0;
let canClick = false;
let timeoutId;

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

function startRound() {
    canClick = false;
    playerSequence = [];
    scoreDisplay.textContent = `Score: ${score}`;

    const randomTile = Math.floor(Math.random() * TILES_COUNT);
    sequence.push(randomTile);

    displaySequence();
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
        clearTimeout(timeoutId);
        setTimeout(startRound, 1000);
    }
}

function gameOver() {
    clearTimeout(timeoutId);
    canClick = false;
    alert(`Game Over! Your score: ${score}`);
    resetGame();
}

function resetGame() {
    sequence = [];
    playerSequence = [];
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
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
