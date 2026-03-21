const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 800;
const GAME_HEIGHT = 800;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let isPlaying = false;
let gameTime = 0;
let killCount = 0;
let level = 1;
let xp = 0;
let nextXp = 200;
let lastTime = 0;

const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function getDist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 스킬 설정 데이터
const SKILL_CONFIG = {
    sword: { name: '칼날', icon: '⚔️', desc: '회전하는 칼날을 추가하고 속도를 강화합니다.' },
    arrow: { name: '화살', icon: '🏹', desc: '가까운 적을 추적하는 화살을 발사합니다.' },
    fire: { name: '화염', icon: '🔥', desc: '주변 적들을 주기적으로 불태웁니다.' },
    speed: { name: '이속', icon: '👟', desc: '이동 속도가 2%씩 영구적으로 증가합니다.' },
    hp: { name: '체력', icon: '❤️', desc: '최대 체력이 20씩 증가합니다.' },
    armor: { name: '갑옷', icon: '🛡️', desc: '받는 피해가 2%씩 감소합니다.' },
    shield: { name: '실드', icon: '💠', desc: '피해를 막아주는 실드 재생 속도가 빨라집니다.' }
};

class Player {
    constructor() {
        this.init();
    }

    init() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT / 2;
        this.radius = 15;
        this.baseSpeed = 3;
        this.hp = 100;
        this.maxHp = 100;
        this.magnetRange = 100;
        
        // 스킬 레벨 관리
        this.skillLevels = {
            sword: 1, arrow: 1, fire: 0, speed: 0, hp: 0, armor: 0, shield: 0
        };

        // 전투 상태 변수
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.burnTimer = 0;
        this.arrowTimer = 0;
        
        this.showBurnEffect = false;
    }

    get speed() {
        return this.baseSpeed * (1 + (this.skillLevels.speed * 0.02));
    }

    get armor() {
        return this.skillLevels.armor * 0.02;
    }

    update(dt) {
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

        // 실드 시스템 (Lv 1부터 작동)
        if (this.skillLevels.shield > 0) {
            if (!this.shieldActive) {
                this.shieldTimer += dt;
                const cooldown = Math.max(2000, 11000 - (this.skillLevels.shield * 1000));
                if (this.shieldTimer >= cooldown) {
                    this.shieldActive = true;
                    this.shieldTimer = 0;
                }
            }
        }

        // 화염 오오라 시스템
        if (this.skillLevels.fire > 0) {
            this.burnTimer += dt;
            const cooldown = Math.max(1000, 3300 - (this.skillLevels.fire * 300));
            if (this.burnTimer >= cooldown) {
                this.activateBurn();
                this.burnTimer = 0;
            }
        }

        // 화살 시스템
        if (this.skillLevels.arrow > 0) {
            this.arrowTimer += dt;
            if (this.arrowTimer >= 1200) {
                const count = this.skillLevels.arrow; // 레벨당 1발
                const targets = findNearestEnemies(count);
                targets.forEach(t => {
                    projectiles.push(new Projectile(this.x, this.y, t.x, t.y, 30 + (this.skillLevels.arrow * 5)));
                });
                this.arrowTimer = 0;
            }
        }
    }

    activateBurn() {
        const range = 120 + (this.skillLevels.fire * 15);
        const dmg = 30 + (this.skillLevels.fire * 10);
        enemies.forEach(e => {
            if (getDist(this.x, this.y, e.x, e.y) < range) {
                e.hp -= dmg;
                if (e.hp <= 0) e.kill();
            }
        });
        this.showBurnEffect = true;
        setTimeout(() => this.showBurnEffect = false, 400);
    }

    takeDamage(amount) {
        if (this.shieldActive) {
            this.shieldActive = false;
            return;
        }
        this.hp -= amount * (1 - this.armor);
        if (this.hp <= 0) gameOver();
    }

    draw() {
        if (this.showBurnEffect) {
            const range = 120 + (this.skillLevels.fire * 15);
            ctx.beginPath();
            ctx.arc(this.x, this.y, range, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 87, 34, 0.2)';
            ctx.fill();
            ctx.closePath();
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3498db';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        }

        const barW = 40;
        ctx.fillStyle = '#444';
        ctx.fillRect(this.x - barW/2, this.y + this.radius + 10, barW, 6);
        ctx.fillStyle = '#ff5252';
        ctx.fillRect(this.x - barW/2, this.y + this.radius + 10, (this.hp / this.maxHp) * barW, 6);
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type === 'boss' ? 40 : 12;
        this.hp = type === 'boss' ? 1500 : 25 + (gameTime / 4);
        this.maxHp = this.hp;
        const baseSpeed = type === 'boss' ? 1.2 : 0.7 + Math.random() * 0.5;
        this.speed = Math.min(2.5, baseSpeed + (gameTime / 150)); 
        this.color = type === 'boss' ? '#e74c3c' : '#95a5a6';
        this.dead = false;
    }

    update(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    kill() {
        if (this.dead) return;
        this.dead = true;
        killCount++;
        const dropType = Math.random() < 0.06 ? 'hp' : 'xp';
        drops.push(new Drop(this.x, this.y, dropType));
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
    constructor(x, y, tx, ty, dmg) {
        this.x = x; this.y = y;
        const angle = Math.atan2(ty - y, tx - x);
        this.vx = Math.cos(angle) * 8;
        this.vy = Math.sin(angle) * 8;
        this.damage = dmg;
        this.life = 120;
    }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        if (this.x < 0) this.x = GAME_WIDTH;
        if (this.x > GAME_WIDTH) this.x = 0;
        if (this.y < 0) this.y = GAME_HEIGHT;
        if (this.y > GAME_HEIGHT) this.y = 0;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        ctx.closePath();
    }
}

class Drop {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.radius = type === 'hp' ? 7 : 4;
        this.pulled = false;
    }
    update(player) {
        const dist = getDist(this.x, this.y, player.x, player.y);
        if (dist < player.magnetRange) this.pulled = true;
        if (this.pulled) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 10;
            this.y += Math.sin(angle) * 10;
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.type === 'xp' ? '#2ecc71' : '#ff5252';
        ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.stroke();
        ctx.closePath();
    }
}

let player = new Player();
let enemies = [];
let projectiles = [];
let drops = [];

function spawnEnemy() {
    if (!isPlaying || enemies.length > 70) return;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : GAME_WIDTH + 30;
        y = Math.random() * GAME_HEIGHT;
    } else {
        x = Math.random() * GAME_WIDTH;
        y = Math.random() < 0.5 ? -30 : GAME_HEIGHT + 30;
    }
    if (killCount > 0 && killCount % 100 === 0 && !enemies.find(e => e.type === 'boss')) {
        enemies.push(new Enemy(x, y, 'boss'));
    } else {
        enemies.push(new Enemy(x, y));
    }
}

function update(time) {
    if (!isPlaying) { lastTime = time; requestAnimationFrame(update); return; }
    const dt = time - lastTime;
    lastTime = time;
    gameTime += dt / 1000;

    player.update(dt);

    enemies.forEach(e => {
        e.update(player);
        if (getDist(player.x, player.y, e.x, e.y) < player.radius + e.radius) {
            player.takeDamage(0.4);
        }
        projectiles.forEach((p, pIdx) => {
            if (getDist(p.x, p.y, e.x, e.y) < 5 + e.radius) {
                e.hp -= p.damage;
                projectiles.splice(pIdx, 1);
                if (e.hp <= 0) e.kill();
            }
        });
    });

    enemies = enemies.filter(e => !e.dead);
    projectiles.forEach(p => p.update());
    projectiles = projectiles.filter(p => p.life > 0);

    drops.forEach((d, dIdx) => {
        d.update(player);
        if (getDist(player.x, player.y, d.x, d.y) < player.radius + 10) {
            if (d.type === 'xp') {
                xp += 15;
                if (xp >= nextXp) levelUp();
            } else {
                player.hp = Math.min(player.maxHp, player.hp + 20);
            }
            drops.splice(dIdx, 1);
        }
    });

    if (Math.random() < 0.02 + (gameTime / 1000)) spawnEnemy();

    updateHUD();
    render();
    requestAnimationFrame(update);
}

function findNearestEnemies(n) {
    return [...enemies].sort((a, b) => getDist(player.x, player.y, a.x, a.y) - getDist(player.x, player.y, b.x, b.y)).slice(0, n);
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

    if (player.skillLevels.sword > 0) {
        const speed = 2.5 + (player.skillLevels.sword * 1.2);
        const angle = (performance.now() / 1000) * speed;
        const count = player.skillLevels.sword;
        const dmg = 0.5 + (player.skillLevels.sword * 0.2);
        for(let i=0; i<count; i++) {
            const orbit = angle + (Math.PI * 2 / count) * i;
            const sx = player.x + Math.cos(orbit) * 70;
            const sy = player.y + Math.sin(orbit) * 70;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(orbit);
            ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
            ctx.fillRect(60, -4, 25, 8);
            ctx.restore();
            enemies.forEach(e => {
                if (getDist(sx, sy, e.x, e.y) < 20 + e.radius) {
                    e.hp -= dmg;
                    if (e.hp <= 0) e.kill();
                }
            });
        }
    }
}

function updateHUD() {
    document.getElementById('xp-bar').style.width = `${(xp / nextXp) * 100}%`;
    document.getElementById('level-display').textContent = `LEVEL ${level}`;
    document.getElementById('score-val').textContent = Math.floor(gameTime) + killCount;
    
    // 스킬 아이콘 업데이트
    const container = document.getElementById('skill-icons');
    container.innerHTML = '';
    for (const [key, lv] of Object.entries(player.skillLevels)) {
        if (lv > 0) {
            const slot = document.createElement('div');
            slot.className = 'skill-slot';
            slot.innerHTML = `${SKILL_CONFIG[key].icon}<span class="skill-level">${lv}</span>`;
            container.appendChild(slot);
        }
    }
}

function levelUp() {
    isPlaying = false;
    xp = 0;
    level++;
    nextXp = Math.floor(nextXp * 1.3);
    const overlay = document.getElementById('levelup-overlay');
    const list = document.getElementById('upgrade-list');
    list.innerHTML = '';
    
    // 모든 스킬 중 랜덤 3개 선택
    const skillKeys = Object.keys(SKILL_CONFIG);
    const shuffled = skillKeys.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    shuffled.forEach(key => {
        const skill = SKILL_CONFIG[key];
        const currentLv = player.skillLevels[key];
        const div = document.createElement('div');
        div.className = 'upgrade-item';
        div.innerHTML = `
            <span class="item-name">${skill.icon} ${skill.name} (Lv.${currentLv} → ${currentLv + 1})</span>
            <span class="item-desc">${skill.desc}</span>
        `;
        div.onclick = () => {
            player.skillLevels[key]++;
            if (key === 'hp') { player.maxHp += 20; player.hp += 20; }
            overlay.classList.add('hidden');
            isPlaying = true;
            lastTime = performance.now();
        };
        list.appendChild(div);
    });
    overlay.classList.remove('hidden');
}

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    isPlaying = true;
    lastTime = performance.now();
}

function init() {
    player = new Player();
    enemies = []; projectiles = []; drops = [];
    gameTime = 0; killCount = 0; level = 1; xp = 0; nextXp = 200;
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