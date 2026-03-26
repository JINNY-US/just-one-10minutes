const GRID_COLS = 5;
const GRID_ROWS = 3;
const TILE_SIZE = 70;
const GAP = 10;

let sp = 100;
let cost = 10;
let hp = 10;
let wave = 1;
let grid = Array(GRID_COLS * GRID_ROWS).fill(null);
let isWaveRunning = false;
let isGameStarted = false;
let draggedIdx = null;

const types = [
    { name: 'common', color: '#bdc3c7', power: 10 },
    { name: 'rare', color: '#2ecc71', power: 18 },
    { name: 'epic', color: '#9b59b6', power: 35 },
    { name: 'legend', color: '#f1c40f', power: 70 }
];

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridEl = document.getElementById('grid');
const spEl = document.getElementById('sp-val');
const costEl = document.getElementById('cost-val');
const hpEl = document.getElementById('hp-val');
const waveEl = document.getElementById('wave-val');
const summonBtn = document.getElementById('summon-btn');
const startOverlay = document.getElementById('start-overlay');
const realStartBtn = document.getElementById('real-start-btn');

const centerX = 300;
const centerY = 200;
const pathHalfW = 240;
const pathHalfH = 160;

const pathPoints = [
    { x: centerX - pathHalfW, y: centerY - pathHalfH },
    { x: centerX + pathHalfW, y: centerY - pathHalfH },
    { x: centerX + pathHalfW, y: centerY + pathHalfH },
    { x: centerX - pathHalfW, y: centerY + pathHalfH },
    { x: centerX - pathHalfW, y: centerY - pathHalfH }
];

let enemies = [];
let bullets = [];
let lastTime = 0;

// 다크모드 초기화 및 연동
function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'on';
    if (isDark) {
        document.body.classList.add('dark');
        document.getElementById('darkModeToggle').checked = true;
    } else {
        document.body.classList.remove('dark');
        document.getElementById('darkModeToggle').checked = false;
    }
}

function initGrid() {
    gridEl.innerHTML = '';
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = i;
        
        // 드래그 앤 드롭 이벤트 추가
        tile.addEventListener('dragstart', (e) => handleDragStart(e, i));
        tile.addEventListener('dragover', handleDragOver);
        tile.addEventListener('dragleave', handleDragLeave);
        tile.addEventListener('drop', (e) => handleDrop(e, i));
        tile.addEventListener('dragend', handleDragEnd);

        gridEl.appendChild(tile);
    }
    renderGrid();
}

function renderGrid() {
    const tiles = document.querySelectorAll('.tile');
    grid.forEach((data, i) => {
        const el = tiles[i];
        el.className = 'tile';
        if (data) {
            el.classList.add(`type-${data.type.name}`);
            el.classList.add('active-dice');
            el.innerHTML = data.level; // 숫자만 크게 표시
            el.draggable = true; // 타일이 있을 때만 드래그 가능
        } else {
            el.innerHTML = '';
            el.draggable = false;
        }
    });
    updateUI();
}

function updateUI() {
    spEl.textContent = sp;
    costEl.textContent = cost;
    hpEl.textContent = hp;
    waveEl.textContent = wave;
}

// --- 드래그 핸들러 ---
function handleDragStart(e, idx) {
    if (!grid[idx]) { e.preventDefault(); return; }
    draggedIdx = idx;
    e.currentTarget.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    if (e.currentTarget.classList.contains('tile')) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('drag-over'));
}

function handleDrop(e, targetIdx) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    
    const source = grid[draggedIdx];
    const target = grid[targetIdx];

    if (source && target && 
        source.type.name === target.type.name && 
        source.level === target.level && 
        source.level < 7) {
        
        // 합성 성공
        grid[targetIdx] = { 
            type: source.type, // 타입 유지 (또는 랜덤 타입으로 변경 가능)
            level: source.level + 1 
        };
        grid[draggedIdx] = null;
        renderGrid();
    }
    draggedIdx = null;
}

function summonDice() {
    if (sp < cost || !isGameStarted) return;
    const emptyIndices = grid.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (emptyIndices.length === 0) return;

    const randIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const randType = types[Math.random() < 0.15 ? 1 : 0];
    
    grid[randIdx] = { type: randType, level: 1 };
    sp -= cost;
    cost += 10;
    renderGrid();
}

function spawnEnemy() {
    const enemyHp = 50 + (wave * 30);
    enemies.push({
        x: pathPoints[0].x,
        y: pathPoints[0].y,
        targetPointIdx: 1,
        hp: enemyHp,
        maxHp: enemyHp,
        speed: 1.5 + (wave * 0.1),
        radius: 12,
        dead: false
    });
}

function update(time) {
    const dt = (time - lastTime) / 16;
    lastTime = time;

    if (isWaveRunning) {
        enemies.forEach(e => {
            const target = pathPoints[e.targetPointIdx];
            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < e.speed * dt) {
                e.x = target.x;
                e.y = target.y;
                e.targetPointIdx++;
                if (e.targetPointIdx >= pathPoints.length) {
                    hp--;
                    e.dead = true;
                    updateUI(); // 생명 감소 실시간 반영
                    if (hp <= 0) endGame();
                }
            } else {
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
            }
        });

        grid.forEach((dice, i) => {
            if (!dice) return;
            const row = Math.floor(i / GRID_COLS);
            const col = i % GRID_COLS;
            
            const gridRect = gridEl.getBoundingClientRect();
            const containerRect = document.getElementById('board-container').getBoundingClientRect();
            
            const tx = (gridRect.left - containerRect.left) + col * (TILE_SIZE + GAP) + TILE_SIZE/2;
            const ty = (gridRect.top - containerRect.top) + row * (TILE_SIZE + GAP) + TILE_SIZE/2;

            let closest = null;
            let minDist = Infinity; // 사거리 무제한

            enemies.forEach(e => {
                const d = Math.sqrt((tx - e.x) ** 2 + (ty - e.y) ** 2);
                if (d < minDist) {
                    minDist = d;
                    closest = e;
                }
            });

            // 공격 속도: 레벨에 비례 (기본 0.03 * 레벨)
            const attackChance = 0.03 * dice.level;
            if (closest && Math.random() < attackChance) {
                bullets.push({
                    x: tx, y: ty,
                    target: closest,
                    speed: 8,
                    damage: dice.type.power * dice.level,
                    color: dice.type.color,
                    dead: false
                });
            }
        });

        bullets.forEach(b => {
            const dx = b.target.x - b.x;
            const dy = b.target.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < b.speed) {
                if (!b.dead) {
                    b.target.hp -= b.damage;
                    b.dead = true;
                    if (b.target.hp <= 0 && !b.target.dead) {
                        b.target.dead = true;
                        sp += 10;
                        updateUI(); // SP 증가 실시간 반영
                    }
                }
            } else {
                b.x += (dx / dist) * b.speed;
                b.y += (dy / dist) * b.speed;
            }
        });

        enemies = enemies.filter(e => !e.dead);
        bullets = bullets.filter(b => !b.dead);
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(150,150,150,0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for(let i=1; i<pathPoints.length; i++) ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    enemies.forEach(e => {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#444';
        ctx.fillRect(e.x - 15, e.y - 20, 30, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(e.x - 15, e.y - 20, (e.hp / e.maxHp) * 30, 4);
    });

    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

function startWave() {
    isWaveRunning = true;
    let spawnCount = 0;
    const maxSpawn = 10 + wave * 2;
    const spawnInterval = setInterval(() => {
        spawnEnemy();
        spawnCount++;
        if (spawnCount >= maxSpawn) {
            clearInterval(spawnInterval);
            checkWaveEnd();
        }
    }, 1000 - Math.min(500, wave * 50));
}

function checkWaveEnd() {
    const checkInterval = setInterval(() => {
        if (enemies.length === 0) {
            clearInterval(checkInterval);
            isWaveRunning = false;
            wave++;
            sp += 50;
            updateUI();
            setTimeout(startWave, 2000);
        }
    }, 500);
}

function endGame() {
    alert(`게임 오버! 도달한 웨이브: ${wave}`);
    location.reload();
}

const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
        document.body.classList.add('dark');
        localStorage.setItem('darkMode', 'on');
    } else {
        document.body.classList.remove('dark');
        localStorage.setItem('darkMode', 'off');
    }
});

realStartBtn.onclick = () => {
    startOverlay.style.display = 'none';
    isGameStarted = true;
    startWave();
};

summonBtn.onclick = summonDice;

initDarkMode();
initGrid();
requestAnimationFrame(update);
