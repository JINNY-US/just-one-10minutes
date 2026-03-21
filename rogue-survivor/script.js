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
let xp = 0;
let nextXp = 100;
let lastTime = 0;

// 입력 관리
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// 유틸리티 함수
function getDist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 스킬 강화 데이터
const UPGRADES = [
    { id: 'sword_speed', name: '칼날 회전 강화', desc: '회전 칼날의 속도가 빨라집니다.', type: 'stat' },
    { id: 'sword_count', name: '칼날 개수 추가', desc: '회전하는 칼날이 하나 더 생깁니다.', type: 'weapon' },
    { id: 'arrow_dmg', name: '추적 화살 강화', desc: '화살의 공격력이 강해집니다.', type: 'stat' },
    { id: 'hp_max', name: '최대 체력 증가', desc: '최대 체력이 20 증가합니다.', type: 'stat' },
    { id: 'move_speed', name: '이동 속도 강화', desc: '이동 속도가 10% 증가합니다.', type: 'stat' },
    { id: 'magnet_range', name: '자성 강화', desc: '경험치를 끌어오는 범위가 넓어집니다.', type: 'stat' }
];

// 게임 객체 클래스
class Player {
    constructor() {
        this.init();
    }

    init() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT / 2;
        this.radius = 15;
        this.speed = 3;
        this.hp = 100;
        this.maxHp = 100;
        this.magnetRange = 100;
        this.weapons = [
            { type: 'sword', level: 1, timer: 0 },
            { type: 'arrow', level: 1, timer: 0, damage: 30 }
        ];
    }

    update() {
        let dx = 0, dy = 0;
        if (keys['KeyW']) dy -= 1;
        if (keys['KeyS']) dy += 1;
        if (keys['KeyA']) dx -= 1;
        if (keys['KeyD']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const mag = Math.sqrt(dx * dx + dy * dy);
            dx /= mag; dy /= mag;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        if (this.x < 0) this.x = GAME_WIDTH;
        if (this.x > GAME_WIDTH) this.x = 0;
        if (this.y < 0) this.y = GAME_HEIGHT;
        if (this.y > GAME_HEIGHT) this.y = 0;
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

        const barWidth = 40;
        const barHeight = 6;
        ctx.fillStyle = '#444';
        ctx.fillRect(this.x - barWidth / 2, this.y + this.radius + 10, barWidth, barHeight);
        ctx.fillStyle = '#ff5252';
        ctx.fillRect(this.x - barWidth / 2, this.y + this.radius + 10, (this.hp / this.maxHp) * barWidth, barHeight);
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'boss' ? 40 : 12;
        this.hp = type === 'boss' ? 1000 : 20 + (gameTime / 5);
        this.maxHp = this.hp;
        const baseSpeed = type === 'boss' ? 1.2 : 0.6 + Math.random() * 0.5;
        this.speed = Math.min(2.5, baseSpeed + (gameTime / 120)); 
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
        if (this.x < 0) this.x = GAME_WIDTH;
        if (this.x > GAME_WIDTH) this.x = 0;
        if (this.y < 0) this.y = GAME_HEIGHT;
        if (this.y > GAME_HEIGHT) this.y = 0;
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.isBeingPulled = false;
    }

    update(player) {
        const dist = getDist(this.x, this.y, player.x, player.y);
        if (dist < player.magnetRange) this.isBeingPulled = true;
        if (this.isBeingPulled) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#2ecc71';
        ctx.fill();
        ctx.closePath();
    }
}

let player = new Player();
let enemies = [];
let projectiles = [];
let drops = [];

function spawnEnemy() {
    if (!isPlaying || enemies.length > 60) return;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -20 : GAME_WIDTH + 20;
        y = Math.random() * GAME_HEIGHT;
    } else {
        x = Math.random() * GAME_WIDTH;
        y = Math.random() < 0.5 ? -20 : GAME_HEIGHT + 20;
    }
    if (killCount > 0 && killCount % 100 === 0 && !enemies.find(e => e.type === 'boss')) {
        enemies.push(new Enemy(x, y, 'boss'));
    } else {
        enemies.push(new Enemy(x, y));
    }
}

function update(time) {
    if (!isPlaying) {
        lastTime = time;
        requestAnimationFrame(update);
        return;
    }
    const dt = time - lastTime;
    lastTime = time;
    gameTime += dt / 1000;

    player.update();

    const arrowWeapon = player.weapons.find(w => w.type === 'arrow');
    if (arrowWeapon) {
        arrowWeapon.timer += dt;
        if (arrowWeapon.timer > 1200) {
            const target = findNearestEnemy();
            if (target) {
                projectiles.push(new Projectile(player.x, player.y, target.x, target.y, arrowWeapon.damage));
                arrowWeapon.timer = 0;
            }
        }
    }

    enemies.forEach((enemy, eIdx) => {
        enemy.update(player);
        if (getDist(player.x, player.y, enemy.x, enemy.y) < player.radius + enemy.radius) {
            player.hp -= 0.3;
            if (player.hp <= 0) gameOver();
        }
        projectiles.forEach((p, pIdx) => {
            if (getDist(p.x, p.y, enemy.x, enemy.y) < p.radius + enemy.radius) {
                enemy.hp -= p.damage;
                projectiles.splice(pIdx, 1);
                if (enemy.hp <= 0) {
                    killCount++;
                    drops.push(new Drop(enemy.x, enemy.y));
                    enemies.splice(eIdx, 1);
                }
            }
        });
    });

    projectiles.forEach(p => p.update());
    projectiles = projectiles.filter(p => p.life > 0);

    drops.forEach((drop, dIdx) => {
        drop.update(player);
        if (getDist(player.x, player.y, drop.x, drop.y) < player.radius + 10) {
            xp += 25;
            if (xp >= nextXp) levelUp();
            drops.splice(dIdx, 1);
        }
    });

    if (Math.random() < 0.02 + (gameTime / 1000)) spawnEnemy();

    updateHUD();
    render();
    requestAnimationFrame(update);
}

function findNearestEnemy() {
    let nearest = null;
    let minDist = Infinity;
    enemies.forEach(e => {
        const d = getDist(player.x, player.y, e.x, e.y);
        if (d < minDist) { minDist = d; nearest = e; }
    });
    return nearest;
}

function render() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for(let i=0; i<GAME_WIDTH; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,GAME_HEIGHT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(GAME_WIDTH,i); ctx.stroke();
    }
    drops.forEach(d => d.draw());
    enemies.forEach(e => e.draw());
    projectiles.forEach(p => p.draw());
    player.draw();

    const swordWeapon = player.weapons.find(w => w.type === 'sword');
    if (swordWeapon) {
        const speed = 4 + swordWeapon.level * 0.8;
        const angle = (performance.now() / 1000) * speed;
        const count = Math.floor(swordWeapon.level / 2) + 1;
        for(let i=0; i<count; i++) {
            const orbitAngle = angle + (Math.PI * 2 / count) * i;
            const sx = player.x + Math.cos(orbitAngle) * 60;
            const sy = player.y + Math.sin(orbitAngle) * 60;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(orbitAngle);
            ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
            ctx.fillRect(50, -4, 25, 8);
            ctx.restore();
            enemies.forEach((enemy, eIdx) => {
                if (getDist(sx, sy, enemy.x, enemy.y) < 20 + enemy.radius) {
                    enemy.hp -= 0.5;
                    if (enemy.hp <= 0) {
                        killCount++;
                        drops.push(new Drop(enemy.x, enemy.y));
                        enemies.splice(eIdx, 1);
                    }
                }
            });
        }
    }
}

function updateHUD() {
    document.getElementById('xp-bar').style.width = `${(xp / nextXp) * 100}%`;
    document.getElementById('level-display').textContent = `LEVEL ${level}`;
    const score = Math.floor(gameTime) + killCount;
    document.getElementById('score-val').textContent = score;
}

function levelUp() {
    isPlaying = false;
    xp = 0;
    level++;
    nextXp = Math.floor(nextXp * 1.3);
    const overlay = document.getElementById('levelup-overlay');
    const list = document.getElementById('upgrade-list');
    list.innerHTML = '';
    const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.forEach(up => {
        const div = document.createElement('div');
        div.className = 'upgrade-item';
        div.innerHTML = `<span class="item-name">${up.name}</span><span class="item-desc">${up.desc}</span>`;
        div.onclick = () => {
            applyUpgrade(up);
            overlay.classList.add('hidden');
            isPlaying = true;
            lastTime = performance.now();
        };
        list.appendChild(div);
    });
    overlay.classList.remove('hidden');
}

function applyUpgrade(up) {
    if (up.id === 'hp_max') { player.maxHp += 20; player.hp += 20; }
    if (up.id === 'move_speed') player.speed += 0.3;
    if (up.id === 'magnet_range') player.magnetRange += 40;
    if (up.id === 'sword_speed' || up.id === 'sword_count') {
        const w = player.weapons.find(w => w.type === 'sword');
        if (w) w.level++;
    }
    if (up.id === 'arrow_dmg') {
        const w = player.weapons.find(w => w.type === 'arrow');
        if (w) { w.level++; w.damage += 15; }
    }
}

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    isPlaying = true;
    lastTime = performance.now();
}

function init() {
    player = new Player();
    enemies = [];
    projectiles = [];
    drops = [];
    gameTime = 0;
    killCount = 0;
    level = 1;
    xp = 0;
    nextXp = 100;
    
    updateHUD();
    requestAnimationFrame(update);
}

document.getElementById('start-btn').onclick = startGame;
document.getElementById('reset-btn').onclick = () => location.reload();

function gameOver() {
    if (!isPlaying) return;
    isPlaying = false;
    const finalScore = Math.floor(gameTime) + killCount;
    alert(`게임 오버! 최종 점수: ${finalScore}점 (생존: ${Math.floor(gameTime)}초, 처치: ${killCount}마리)`);
    location.reload();
}

init();