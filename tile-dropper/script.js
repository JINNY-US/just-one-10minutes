const WIDTH = 23;
const HEIGHT = 15;
const MAX_TIME = 120;

/*const COLORS = [
  "#ffadad","#a0c4ff","#caffbf","#ffd6a5","#bdb2ff",
  "#ffc6ff","#9bf6ff","#fdffb6","#d0f4de","#e4c1f9"
];*/

const COLORS = [
  "#FF4136", // 빨강
  "#FF851B", // 주황
  "#FFDC00", // 노랑
  "#2ECC40", // 초록
  "#0074D9", // 파랑
  "#bdb2ff", // 파스텔보라
  "#ffadad", // 핑크
  "#39CCCC", // 청록
  "#fdffb6", // 파스텔노랑
  "#3D9970"  // 올리브톤
];

let grid = [];
let score = 0;
let time = MAX_TIME;
let timer;
let isPlaying = false;

const gameEl = document.getElementById("game");
const scoreEl = document.getElementById("score");
const timerBar = document.getElementById("timer-bar");

const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const overlay = document.getElementById("start-overlay");

const popSound = document.getElementById("popSound");
const failSound = document.getElementById("failSound");
// 게임 설정
const ROWS = 13;
const COLS = 23;

startBtn.onclick = () => {
  overlay.style.display = "none";
  startGame();
};

// 다시하기
resetBtn.onclick = () => {
  clearInterval(timer);
  isPlaying = false;

  generateGrid();
  render();

  overlay.style.display = "flex";
};

// 게임 시작
function startGame() {
  clearInterval(timer);

  score = 0;
  time = MAX_TIME;
  isPlaying = true;

  generateGrid();
  render();

  timer = setInterval(() => {
    time--;

    if (time <= 0) {
      clearInterval(timer);
      isPlaying = false;
      alert("게임 종료! 점수: " + score);
      overlay.style.display = "flex";
    }

    updateUI();
  }, 1000);
}

// 그리드 생성
function generateGrid() {
  const EMPTY_RATE = 0.35;
  grid = [];

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {

      if (x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1) {
        grid.push(null);
      } else {
        if (Math.random() < EMPTY_RATE) {
          grid.push(null);
        } else {
          grid.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
        }
      }
    }
  }
}

// 렌더링
function render() {
  gameEl.innerHTML = "";

  grid.forEach((cell, i) => {
    const div = document.createElement("div");
    div.classList.add("tile");

    if (cell === null) {
      div.classList.add("empty");

      const x = i % WIDTH;
      const y = Math.floor(i / WIDTH);

      div.classList.add((x + y) % 2 === 0 ? "light" : "dark");
    } else {
      div.style.background = cell;
    }

    div.onclick = () => handleClick(i);
    gameEl.appendChild(div);
  });

  updateUI();
}

// 클릭 처리
function handleClick(index) {
  if (!isPlaying) return;
  if (grid[index] !== null) return;

  const found = findMatches(index);

  if (found.length >= 2) {
    animateRemove(found);

    popSound.currentTime = 0;
    popSound.play();

    setTimeout(() => {
      found.forEach(i => grid[i] = null);
      score += found.length;
      render();
    }, 200);

  } else {
    failSound.currentTime = 0;
    failSound.play();

    time = Math.max(0, time - 10);
    updateUI();
  }
}

// 애니메이션
function animateRemove(indices) {
  const tiles = document.querySelectorAll(".tile");
  indices.forEach(i => {
    tiles[i].classList.add("removing");
  });
}

// 매칭 탐색
function findMatches(index) {
  const x = index % WIDTH;
  const y = Math.floor(index / WIDTH);

  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  let found = [];

  dirs.forEach(([dx,dy]) => {
    let nx = x+dx, ny = y+dy;

    while (nx>=0 && ny>=0 && nx<WIDTH && ny<HEIGHT) {
      let ni = ny*WIDTH + nx;
      if (grid[ni] !== null) {
        found.push(ni);
        break;
      }
      nx += dx;
      ny += dy;
    }
  });

  let map = {};
  found.forEach(i => {
    let c = grid[i];
    if (!map[c]) map[c] = [];
    map[c].push(i);
  });

  let result = [];
  for (let c in map) {
    if (map[c].length >= 2) {
      result = result.concat(map[c]);
    }
  }

  return result;
}

// UI 업데이트
function updateUI() {
  scoreEl.textContent = "점수: " + score;

  const percent = (time / MAX_TIME) * 100;
  timerBar.style.width = percent + "%";

  if (percent < 30) {
    timerBar.style.background = "red";
  } else if (percent < 60) {
    timerBar.style.background = "orange";
  } else {
    timerBar.style.background = "#4caf50";
  }
}

// 초기화: 게임 시작 전에도 보드 레이아웃을 잡기 위해 실행
generateGrid();
render();
updateUI();
