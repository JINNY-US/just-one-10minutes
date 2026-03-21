const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 설정
const GAME_WIDTH = 800;
const GAME_HEIGHT = 800;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let isPlaying = false;
let gameTime = 0;
let killCount = 0;
let level = 1;
let gold = 0;
let xp = 0;
let nextXp = 100;
let lastTime = 0;
let shopOpenTime = 60; // 60초마다 상점 오픈

// 입력 관리
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// 유틸리티 함수
function getDist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 스킬/아이템 데이터
const UPGRADES = [
    { id: 'sword_speed', name: '칼날 속도 강화', desc: '회전 칼날의 속도가 20% 증가합니다.', type: 'stat' },
    { id: 'sword_count', name: '칼날 개수 추가', desc: '회전하는 칼날이 하나 더 생깁니다.', type: 'weapon' },
    { id: 'arrow_dmg', name: '추적 화살 강화', desc: '화살의 공격력이 25% 증가합니다.', type: 'stat' },
    { id: 'hp_max', name: '체력 증강', desc: '최대 체력이 20 증가합니다.', type: 'stat' },
    { id: 'move_speed', name: '이동 속도 강화', desc: '이동 속도가 10% 증가합니다.', type: 'stat' }
];

const SHOP_ITEMS = [
    { id: 'heal_full', name: '구급 상자', desc: '체력을 모두 회복합니다.', cost: 50 },
    { id: 'bomb_all', name: '메가 폭탄', desc: '화면의 모든 적을 즉시 처치합니다.', cost: 100 },
    { id: 'gold_double', name: '황금 자석', desc: '드랍된 모든 아이템을 끌어옵니다.', cost: 150 }
];

// 게임 객체 클래스
class Player {
    constructor() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT / 2;
        this.radius = 15;
        this.speed = 3;
        this.hp = 100;
        this.maxHp = 100;
        this.weapons = [
            { type: 'sword', level: 1, timer: 0 },
            { type: 'arrow', level: 1, timer: 0 }
        ];
    }

    update() {
        let dx = 0, dy = 0;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const mag = Math.sqrt(dx * dx + dy * dy);
            dx /= mag; dy /= mag;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // 경계 제한
        this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'boss' ? 40 : 12;
        this.hp = type === 'boss' ? 1000 : 20 + (gameTime / 10);
        this.maxHp = this.hp;
        this.speed = type === 'boss' ? 1.5 : 1 + Math.random();
        this.color = type === 'boss' ? '#e74c3c' : '#95a5a6';
    }

    update(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.type === 'boss') {
            // 보스 체력바
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 40, this.y - 60, 80, 8);
            ctx.fillStyle = '#ff5252';
            ctx.fillRect(this.x - 40, this.y - 60, (this.hp / this.maxHp) * 80, 8);
        }
        ctx.closePath();
    }
}

class Projectile {
    constructor(x, y, targetX, targetY, damage) {
        this.x = x;
        this.y = y;
        const angle = Math.atan2(targetY - y, targetX - x);
        this.vx = Math.cos(angle) * 7;
        this.vy = Math.sin(angle) * 7;
        this.radius = 5;
        this.damage = damage;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        ctx.closePath();
    }
}

class Drop {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'xp' or 'gold'
        this.radius = 4;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.type === 'xp' ? '#2ecc71' : '#f1c40f';
        ctx.fill();
        ctx.closePath();
    }
}

// 게임 매니저
let player = new Player();
let enemies = [];
let projectiles = [];
let drops = [];
let particles = [];

function spawnEnemy() {
    if (enemies.length > 50) return;
    
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -50 : GAME_WIDTH + 50;
        y = Math.random() * GAME_HEIGHT;
    } else {
        x = Math.random() * GAME_WIDTH;
        y = Math.random() < 0.5 ? -50 : GAME_HEIGHT + 50;
    }
    
    // 보스 소환 체크
    if (killCount > 0 && killCount % 100 === 0 && !enemies.find(e => e.type === 'boss')) {
        enemies.push(new Enemy(x, y, 'boss'));
    } else {
        enemies.push(new Enemy(x, y));
    }
}

function update(time) {
    if (!isPlaying) return;
    const dt = time - lastTime;
    lastTime = time;
    gameTime += dt / 1000;

    player.update();

    // 무기 시스템 (자동 공격)
    projectiles.push(...updateWeapons(dt));

    // 적 업데이트 및 충돌
    enemies.forEach((enemy, eIdx) => {
        enemy.update(player);
        
        // 플레이어 피격
        if (getDist(player.x, player.y, enemy.x, enemy.y) < player.radius + enemy.radius) {
            player.hp -= 0.5;
            if (player.hp <= 0) gameOver();
        }

        // 투사체 충돌
        projectiles.forEach((p, pIdx) => {
            if (getDist(p.x, p.y, enemy.x, enemy.y) < p.radius + enemy.radius) {
                enemy.hp -= p.damage;
                projectiles.splice(pIdx, 1);
                if (enemy.hp <= 0) {
                    killCount++;
                    drops.push(new Drop(enemy.x, enemy.y, Math.random() < 0.8 ? 'xp' : 'gold'));
                    enemies.splice(eIdx, 1);
                }
            }
        });
    });

    // 투사체 제거
    projectiles = projectiles.filter(p => p.life > 0);

    // 드랍 아이템 획득
    drops.forEach((drop, dIdx) => {
        if (getDist(player.x, player.y, drop.x, drop.y) < player.radius + 20) {
            if (drop.type === 'xp') {
                xp += 20;
                if (xp >= nextXp) levelUp();
            } else {
                gold += 5;
            }
            drops.splice(dIdx, 1);
        }
    });

    // 상점 타임 체크
    if (gameTime >= shopOpenTime) {
        openShop();
        shopOpenTime += 60;
    }

    // 스폰
    if (Math.random() < 0.03 + (gameTime / 1000)) spawnEnemy();

    updateHUD();
    render();
    requestAnimationFrame(update);
}

function updateWeapons(dt) {
    let newProjectiles = [];
    player.weapons.forEach(w => {
        w.timer += dt;
        if (w.type === 'arrow' && w.timer > 1000) {
            const target = findNearestEnemy();
            if (target) {
                newProjectiles.push(new Projectile(player.x, player.y, target.x, target.y, 25));
                w.timer = 0;
            }
        }
    });
    return newProjectiles;
}

function findNearestEnemy() {
    let nearest = null;
    let minDist = Infinity;
    enemies.forEach(e => {
        const d = getDist(player.x, player.y, e.x, e.y);
        if (d < minDist) {
            minDist = d;
            nearest = e;
        }
    });
    return nearest;
}

function render() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // 배경 그리드
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<GAME_WIDTH; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,GAME_HEIGHT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(GAME_WIDTH,i); ctx.stroke();
    }

    drops.forEach(d => d.draw());
    enemies.forEach(e => e.draw());
    projectiles.forEach(p => p.draw());
    player.draw();

    // 회전 칼날 효과 (예시)
    const angle = gameTime * 5;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(241, 196, 15, 0.6)';
    ctx.fillRect(40, -5, 30, 10);
    ctx.restore();
}

function updateHUD() {
    document.getElementById('hp-bar').style.width = `${(player.hp / player.maxHp) * 100}%`;
    document.getElementById('hp-text').textContent = `HP: ${Math.ceil(player.hp)}/${player.maxHp}`;
    document.getElementById('xp-bar').style.width = `${(xp / nextXp) * 100}%`;
    document.getElementById('level-val').textContent = level;
    document.getElementById('kill-val').textContent = killCount;
    document.getElementById('gold-val').textContent = gold;
    
    const min = Math.floor(gameTime / 60);
    const sec = Math.floor(gameTime % 60);
    document.getElementById('game-timer').textContent = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

// UI 이벤트
function levelUp() {
    isPlaying = false;
    xp = 0;
    level++;
    nextXp *= 1.2;
    const overlay = document.getElementById('levelup-overlay');
    const list = document.getElementById('upgrade-list');
    list.innerHTML = '';
    
    // 무작위 3개 선택
    const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.forEach(up => {
        const div = document.createElement('div');
        div.className = 'upgrade-item';
        div.innerHTML = `<span class="item-name">${up.name}</span><span class="item-desc">${up.desc}</span>`;
        div.onclick = () => {
            applyUpgrade(up);
            overlay.classList.add('hidden');
            isPlaying = true;
            requestAnimationFrame(update);
        };
        list.appendChild(div);
    });
    overlay.classList.remove('hidden');
}

function applyUpgrade(up) {
    if (up.id === 'hp_max') { player.maxHp += 20; player.hp += 20; }
    if (up.id === 'move_speed') player.speed *= 1.1;
    // 기타 강화 로직 추가...
}

function openShop() {
    isPlaying = false;
    const overlay = document.getElementById('shop-overlay');
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    
    SHOP_ITEMS.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <span class="item-cost">${item.cost}G</span>
            <span class="item-name">${item.name}</span>
            <span class="item-desc">${item.desc}</span>
        `;
        div.onclick = () => {
            if (gold >= item.cost) {
                gold -= item.cost;
                applyShopItem(item);
                div.style.opacity = '0.5';
                div.onclick = null;
            } else {
                alert('골드가 부족합니다!');
            }
        };
        list.appendChild(div);
    });
    overlay.classList.remove('hidden');
}

function applyShopItem(item) {
    if (item.id === 'heal_full') player.hp = player.maxHp;
    if (item.id === 'bomb_all') {
        enemies.forEach(e => {
            drops.push(new Drop(e.x, e.y, 'xp'));
        });
        enemies = [];
    }
}

document.getElementById('close-shop-btn').onclick = () => {
    document.getElementById('shop-overlay').classList.add('hidden');
    isPlaying = true;
    requestAnimationFrame(update);
};

document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-overlay').style.display = 'none';
    isPlaying = true;
    lastTime = performance.now();
    requestAnimationFrame(update);
};

function gameOver() {
    isPlaying = false;
    alert(`게임 오버! 생존 시간: ${document.getElementById('game-timer').textContent}, 처치 수: ${killCount}`);
    location.reload();
}

function init() {
    updateHUD();
    render();
}

init();