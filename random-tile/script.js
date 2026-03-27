const GRID_COLS = 5;
const GRID_ROWS = 3;
const TILE_SIZE = 70;
const GAP = 10;

let sp = 100;
let cost = 10;
let hp = 10;
let wave = 1;
let gold = parseInt(localStorage.getItem('random-tile-gold')) || 0;

// 영구 업그레이드 데이터 (로컬 스토리지 저장용)
let upgrades = JSON.parse(localStorage.getItem('random-tile-upgrades')) || {
    attack: 0,    // 공격력 증가 (Lv당 5%)
    startSp: 0,   // 시작 SP 증가 (Lv당 20)
    maxHp: 0,     // 최대 체력 증가 (Lv당 1)
    goldBonus: 0  // 골드 획득 증가 (Lv당 10%)
};

let grid = Array(GRID_COLS * GRID_ROWS).fill(null);
let isWaveRunning = false;
let isGameStarted = false;
let isGameOver = false; // 게임 오버 중복 방지 플래그
let draggedIdx = null;

const shopItems = [
    { id: 'attack', name: '공격력 강화', desc: '모든 타일의 공격력이 5% 증가합니다.', baseCost: 100, costStep: 100 },
    { id: 'startSp', name: '시작 자원', desc: '게임 시작 시 SP가 20 증가합니다.', baseCost: 150, costStep: 150 },
    { id: 'maxHp', name: '내구도 강화', desc: '시작 체력이 1 증가합니다.', baseCost: 200, costStep: 200 },
    { id: 'goldBonus', name: '골드 보너스', desc: '웨이브 보상 골드가 10% 증가합니다.', baseCost: 100, costStep: 100 }
];

function saveGameData() {
    localStorage.setItem('random-tile-gold', gold);
    localStorage.setItem('random-tile-upgrades', JSON.stringify(upgrades));
}

// 웨이브 10 단위마다 추가 SP 획득 (10, 20, 30... 웨이브부터 증가)
function getKillSp() {
    return 10 + Math.floor(wave / 10) * 10;
}

function getWaveGold() {
    const base = 20 + wave * 5;
    const bonus = 1 + (upgrades.goldBonus * 0.1);
    return Math.floor(base * bonus);
}

const types = [
    { name: 'fire', color: '#e74c3c', power: 12, desc: '[불타일] 공격 시 타겟 주변에 스플래시 화염 데미지를 입힙니다.', level: 1 },
    { name: 'electric', color: '#f1c40f', power: 10, desc: '[전기타일] 공격 시 타겟 포함 최대 3명의 적에게 연쇄 데미지(100%, 70%, 30%)를 입힙니다.', level: 1 },
    { name: 'wind', color: '#3498db', power: 8, desc: '[바람타일] 매우 빠른 속도로 공격합니다.', level: 1 },
    { name: 'poison', color: '#2ecc71', power: 6, desc: '[독타일] 지속 데미지를 입히며, 독이 없는 적을 우선적으로 공격합니다.', level: 1 },
    { name: 'ice', color: '#a29bfe', power: 7, desc: '[얼음타일] 적의 이동 속도를 감소시킵니다. (최대 3중첩, 50% 감속)', level: 1 }
];

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridEl = document.getElementById('grid');
const spEl = document.getElementById('sp-val');
const goldEl = document.getElementById('gold-val');
const costEl = document.getElementById('cost-val');
const hpEl = document.getElementById('hp-val');
const waveEl = document.getElementById('wave-val');
const summonBtn = document.getElementById('summon-btn');
const shopBtn = document.getElementById('shop-btn');
const inventoryBtn = document.getElementById('inventory-btn');
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
    goldEl.textContent = gold;
    costEl.textContent = cost;
    hpEl.textContent = hp;
    waveEl.textContent = wave;

    document.querySelectorAll('.upgrade-item').forEach(item => {
        const typeName = item.dataset.type;
        const typeData = types.find(t => t.name === typeName);
        const btn = item.querySelector('.upgrade-btn');
        const lvDisplay = item.querySelector('.upgrade-level');
        
        lvDisplay.textContent = `Lv.${typeData.level}`;
        btn.disabled = sp < 100;
    });
}

// 모달 관련 기능
function openModal(id) {
    if (isWaveRunning) return alert('웨이브 중에는 이용할 수 없습니다.');
    document.getElementById(id).style.display = 'flex';
    if (id === 'shop-modal') renderShop();
    if (id === 'inventory-modal') renderInventory();
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function renderShop() {
    const container = document.getElementById('shop-items');
    container.innerHTML = '';
    shopItems.forEach(item => {
        const currentLv = upgrades[item.id];
        const cost = item.baseCost + (currentLv * item.costStep);
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name} (Lv.${currentLv})</span>
                <span class="item-desc">${item.desc}</span>
            </div>
            <button class="btn-buy" onclick="buyUpgrade('${item.id}')" ${gold < cost ? 'disabled' : ''}>
                ${cost} G
            </button>
        `;
        container.appendChild(div);
    });
}

function renderInventory() {
    const container = document.getElementById('inventory-items');
    container.innerHTML = '';
    shopItems.forEach(item => {
        const currentLv = upgrades[item.id];
        if (currentLv > 0) {
            const div = document.createElement('div');
            div.className = 'inventory-item';
            div.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-desc">현재 레벨: Lv.${currentLv}</span>
                </div>
            `;
            container.appendChild(div);
        }
    });
    if (container.innerHTML === '') container.innerHTML = '<p>보유 중인 강화가 없습니다.</p>';
}

window.buyUpgrade = function(id) {
    const item = shopItems.find(i => i.id === id);
    const cost = item.baseCost + (upgrades[id] * item.costStep);
    if (gold >= cost) {
        gold -= cost;
        upgrades[id]++;
        saveGameData();
        updateUI();
        renderShop();
    }
}

window.closeModal = closeModal;

shopBtn.onclick = () => openModal('shop-modal');
inventoryBtn.onclick = () => openModal('inventory-modal');

// 데미지 계산 시 영구 업그레이드 반영
function getAdjustedDamage(baseDamage) {
    return baseDamage * (1 + (upgrades.attack * 0.05));
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
        const randType = types[Math.floor(Math.random() * types.length)];
        grid[targetIdx] = { type: randType, level: source.level + 1 };
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
    // 이동 속도 0.7배 적용
    const baseSpeed = (1.5 + (wave * 0.1)) * 0.7;
    enemies.push({
        x: pathPoints[0].x, y: pathPoints[0].y,
        targetPointIdx: 1, hp: enemyHp, maxHp: enemyHp,
        speed: baseSpeed, radius: 12, dead: false,
        distanceWalked: 0,
        poisonDamage: 0, poisonDuration: 0,
        iceStacks: 0, iceDuration: 0
    });
}

function update(time) {
    const dt = (time - lastTime) / 16;
    lastTime = time;

    if (isWaveRunning && !isGameOver) {
        enemies.forEach(e => {
            if (e.poisonDuration > 0) {
                e.hp -= (e.poisonDamage / 60) * dt;
                e.poisonDuration -= dt;
            }
            if (e.iceDuration > 0) {
                e.iceDuration -= dt;
                if (e.iceDuration <= 0) e.iceStacks = 0;
            }

            const slowFactor = 1 - (Math.min(3, e.iceStacks) * 0.166);
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
            if (e.hp <= 0 && !e.dead) { e.dead = true; sp += getKillSp(); updateUI(); }
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
            if (dice.type.name === 'wind') {
                const typeData = types.find(t => t.name === 'wind');
                baseChance *= (2 + (typeData.level - 1) * 0.2);
            }

            if (targetEnemy && Math.random() < baseChance) {
                bullets.push({
                    x: tx, y: ty, target: targetEnemy, speed: 10,
                    damage: getAdjustedDamage(dice.type.power * dice.level),
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

    const typeLevel = types.find(t => t.name === bullet.type).level;

    switch(bullet.type) {
        case 'fire':
            const splashRange = 60 + (typeLevel - 1) * 10;
            enemies.forEach(e => {
                const d = Math.sqrt((e.x - target.x)**2 + (e.y - target.y)**2);
                if (d < splashRange) {
                    e.hp -= bullet.damage;
                    if (e.hp <= 0 && !e.dead) { e.dead = true; sp += getKillSp(); updateUI(); }
                }
            });
            break;
        case 'electric':
            const chain1Ratio = 0.7 + (typeLevel - 1) * 0.05;
            const chain2Ratio = 0.3 + (typeLevel - 1) * 0.05;
            let chained = [target];
            target.hp -= bullet.damage;
            let current = target;
            for(let i=0; i<2; i++) {
                let next = enemies.find(e => !e.dead && !chained.includes(e) && Math.sqrt((e.x-current.x)**2 + (e.y-current.y)**2) < 100);
                if (next) {
                    chained.push(next);
                    next.hp -= bullet.damage * (i === 0 ? chain1Ratio : chain2Ratio);
                    current = next;
                } else break;
            }
            chained.forEach(e => { if (e.hp <= 0 && !e.dead) { e.dead = true; sp += getKillSp(); updateUI(); } });
            break;
        case 'poison':
            const poisonRatio = 0.5 + (typeLevel - 1) * 0.1;
            target.hp -= bullet.damage;
            target.poisonDamage = bullet.damage * poisonRatio;
            target.poisonDuration = 180;
            break;
        case 'ice':
            const slowDuration = 120 + (typeLevel - 1) * 20;
            target.hp -= bullet.damage;
            target.iceStacks = Math.min(3, (target.iceStacks || 0) + 1);
            target.iceDuration = slowDuration;
            break;
        default:
            target.hp -= bullet.damage;
    }
    if (target.hp <= 0 && !target.dead) { target.dead = true; sp += getKillSp(); updateUI(); }
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
    if (isGameOver) return;
    isWaveRunning = true;
    let spawnCount = 0;
    const maxSpawn = 10 + wave * 2;
    const spawnInterval = setInterval(() => {
        if (isGameOver) { clearInterval(spawnInterval); return; }
        spawnEnemy();
        spawnCount++;
        if (spawnCount >= maxSpawn) { clearInterval(spawnInterval); checkWaveEnd(); }
    }, 1000 - Math.min(500, wave * 50));
}

function checkWaveEnd() {
    const checkInterval = setInterval(() => {
        if (isGameOver) { clearInterval(checkInterval); return; }
        if (enemies.length === 0) {
            clearInterval(checkInterval);
            isWaveRunning = false;
            const waveGold = getWaveGold();
            gold += waveGold;
            wave++; 
            sp += (50 + Math.floor(wave / 10) * 10); 
            saveGameData();
            updateUI();
            setTimeout(startWave, 2000);
        }
    }, 500);
}

function endGame() { 
    if (isGameOver) return;
    isGameOver = true;
    saveGameData(); // 게임 종료 시 골드 저장
    alert(`게임 오버! 도달한 웨이브: ${wave}\n획득한 총 골드는 상점에서 사용 가능합니다.`); 
    location.reload(); 
}

const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) { document.body.classList.add('dark'); localStorage.setItem('darkMode', 'on'); }
    else { document.body.classList.remove('dark'); localStorage.setItem('darkMode', 'off'); }
});

// 강화 패널 아이콘 클릭 시 설명 표시
document.querySelectorAll('.upgrade-icon').forEach(icon => {
    icon.style.cursor = 'pointer';
    icon.onclick = (e) => {
        const typeName = e.target.closest('.upgrade-item').dataset.type;
        const typeData = types.find(t => t.name === typeName);
        alert(typeData.desc);
    };
});

document.querySelectorAll('.upgrade-btn').forEach(btn => {
    btn.onclick = (e) => {
        const typeName = e.target.closest('.upgrade-item').dataset.type;
        const typeData = types.find(t => t.name === typeName);
        
        if (sp >= 100) {
            sp -= 100;
            typeData.level++;
            updateUI();
        }
    };
});

realStartBtn.onclick = () => { 
    startOverlay.style.display = 'none'; 
    isGameStarted = true; 
    // 영구 업그레이드 초기 적용
    sp = 100 + (upgrades.startSp * 20);
    hp = 10 + upgrades.maxHp;
    updateUI();
    startWave(); 
};
summonBtn.onclick = summonDice;
initDarkMode();
initGrid();
requestAnimationFrame(update);
