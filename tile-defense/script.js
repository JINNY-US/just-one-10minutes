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
    { name: 'fire', color: '#e74c3c', power: 12, desc: '스플래시' },
    { name: 'electric', color: '#f1c40f', power: 10, desc: '체인' },
    { name: 'wind', color: '#3498db', power: 8, desc: '고속' },
    { name: 'poison', color: '#2ecc71', power: 6, desc: '독' },
    { name: 'ice', color: '#a29bfe', power: 7, desc: '감속' }
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
            el.innerHTML = data.level;
            el.draggable = true;
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
    if (source && target && source.type.name === target.type.name && source.level === target.level && source.level < 7) {
        grid[targetIdx] = { type: source.type, level: source.level + 1 };
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
    const randType = types[Math.floor(Math.random() * types.length)];
    grid[randIdx] = { type: randType, level: 1 };
    sp -= cost;
    cost += 10;
    renderGrid();
}

function spawnEnemy() {
    const enemyHp = 50 + (wave * 30);
    enemies.push({
        x: pathPoints[0].x, y: pathPoints[0].y,
        targetPointIdx: 1, hp: enemyHp, maxHp: enemyHp,
        speed: 1.5 + (wave * 0.1), radius: 12, dead: false,
        distanceWalked: 0,
        poisonDamage: 0, poisonDuration: 0,
        iceStacks: 0, iceDuration: 0
    });
}

function update(time) {
    const dt = (time - lastTime) / 16;
    lastTime = time;

    if (isWaveRunning) {
        enemies.forEach(e => {
            // 디버프 처리 (초당 60프레임 기준)
            if (e.poisonDuration > 0) {
                e.hp -= (e.poisonDamage / 60) * dt;
                e.poisonDuration -= dt;
            }
            if (e.iceDuration > 0) {
                e.iceDuration -= dt;
                if (e.iceDuration <= 0) e.iceStacks = 0;
            }

            // 이동 처리 (슬로우 반영)
            const slowFactor = 1 - (Math.min(3, e.iceStacks) * 0.166); // 3중첩 시 약 50% 감속
            const currentSpeed = e.speed * slowFactor;

            const target = pathPoints[e.targetPointIdx];
            const dx = target.x - e.x;
            const dy = target.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const moveDist = currentSpeed * dt;

            if (dist < moveDist) {
                e.x = target.x; e.y = target.y;
                e.distanceWalked += dist;
                e.targetPointIdx++;
                if (e.targetPointIdx >= pathPoints.length) {
                    hp--; e.dead = true;
                    updateUI();
                    if (hp <= 0) endGame();
                }
            } else {
                e.x += (dx / dist) * moveDist;
                e.y += (dy / dist) * moveDist;
                e.distanceWalked += moveDist;
            }
            if (e.hp <= 0 && !e.dead) { e.dead = true; sp += 10; updateUI(); }
        });

        grid.forEach((dice, i) => {
            if (!dice) return;
            const row = Math.floor(i / GRID_COLS);
            const col = i % GRID_COLS;
            const containerRect = document.getElementById('board-container').getBoundingClientRect();
            const gridRect = gridEl.getBoundingClientRect();
            const tx = (gridRect.left - containerRect.left) + col * (TILE_SIZE + GAP) + TILE_SIZE/2;
            const ty = (gridRect.top - containerRect.top) + row * (TILE_SIZE + GAP) + TILE_SIZE/2;

            let targetEnemy = null;
            if (dice.type.name === 'poison') {
                // 독 없는 적 우선 공격
                const nonPoisoned = enemies.filter(e => e.poisonDuration <= 0);
                if (nonPoisoned.length > 0) {
                    targetEnemy = nonPoisoned.sort((a,b) => b.distanceWalked - a.distanceWalked)[0];
                } else {
                    targetEnemy = enemies.sort((a,b) => b.distanceWalked - a.distanceWalked)[0];
                }
            } else {
                targetEnemy = enemies.sort((a,b) => b.distanceWalked - a.distanceWalked)[0];
            }

            let baseChance = 0.03 * dice.level;
            if (dice.type.name === 'wind') baseChance *= 2; // 바람은 2배 공속

            if (targetEnemy && Math.random() < baseChance) {
                bullets.push({
                    x: tx, y: ty, target: targetEnemy, speed: 10,
                    damage: dice.type.power * dice.level,
                    color: dice.type.color, type: dice.type.name,
                    level: dice.level, dead: false
                });
            }
        });

        bullets.forEach(b => {
            const dx = b.target.x - b.x;
            const dy = b.target.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.speed) {
                if (!b.dead) {
                    b.dead = true;
                    applyDamage(b);
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

function applyDamage(bullet) {
    const target = bullet.target;
    if (target.dead) return;

    switch(bullet.type) {
        case 'fire':
            // 주변 스플래시
            enemies.forEach(e => {
                const d = Math.sqrt((e.x - target.x)**2 + (e.y - target.y)**2);
                if (d < 60) {
                    e.hp -= bullet.damage;
                    if (e.hp <= 0 && !e.dead) { e.dead = true; sp += 10; updateUI(); }
                }
            });
            break;
        case 'electric':
            // 체인 라이트닝 (3개 적)
            let chained = [target];
            target.hp -= bullet.damage;
            let current = target;
            for(let i=0; i<2; i++) {
                let next = enemies.find(e => !e.dead && !chained.includes(e) && Math.sqrt((e.x-current.x)**2 + (e.y-current.y)**2) < 100);
                if (next) {
                    chained.push(next);
                    next.hp -= bullet.damage * (i === 0 ? 0.7 : 0.3);
                    current = next;
                } else break;
            }
            chained.forEach(e => { if (e.hp <= 0 && !e.dead) { e.dead = true; sp += 10; updateUI(); } });
            break;
        case 'poison':
            target.hp -= bullet.damage;
            target.poisonDamage = bullet.damage * 0.5; // 도트뎀
            target.poisonDuration = 180; // 3초
            break;
        case 'ice':
            target.hp -= bullet.damage;
            target.iceStacks = Math.min(3, (target.iceStacks || 0) + 1);
            target.iceDuration = 120; // 2초
            break;
        default:
            target.hp -= bullet.damage;
    }
    if (target.hp <= 0 && !target.dead) { target.dead = true; sp += 10; updateUI(); }
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
        if (e.poisonDuration > 0) ctx.fillStyle = '#2ecc71';
        if (e.iceStacks > 0) ctx.fillStyle = '#a29bfe';
        
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#444';
        ctx.fillRect(e.x - 15, e.y - 20, 30, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(e.x - 15, e.y - 20, (Math.max(0, e.hp) / e.maxHp) * 30, 4);
    });

    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function startWave() {
    isWaveRunning = true;
    let spawnCount = 0;
    const maxSpawn = 10 + wave * 2;
    const spawnInterval = setInterval(() => {
        spawnEnemy();
        spawnCount++;
        if (spawnCount >= maxSpawn) { clearInterval(spawnInterval); checkWaveEnd(); }
    }, 1000 - Math.min(500, wave * 50));
}

function checkWaveEnd() {
    const checkInterval = setInterval(() => {
        if (enemies.length === 0) {
            clearInterval(checkInterval);
            isWaveRunning = false;
            wave++; sp += 50; updateUI();
            setTimeout(startWave, 2000);
        }
    }, 500);
}

function endGame() { alert(`게임 오버! 도달한 웨이브: ${wave}`); location.reload(); }

const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) { document.body.classList.add('dark'); localStorage.setItem('darkMode', 'on'); }
    else { document.body.classList.remove('dark'); localStorage.setItem('darkMode', 'off'); }
});

realStartBtn.onclick = () => { startOverlay.style.display = 'none'; isGameStarted = true; startWave(); };
summonBtn.onclick = summonDice;
initDarkMode();
initGrid();
requestAnimationFrame(update);
