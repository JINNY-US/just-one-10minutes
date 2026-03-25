// --- Dice Class ---
class Dice {
    constructor(type, pips, rarity, positionIndex, game) {
        this.game = game;
        this.type = type; // 'attack', 'speed', 'poison'
        this.pips = pips; // 1-7
        this.rarity = rarity; // 'normal', 'rare', 'heroic', 'legendary' (for visual only initially)
        this.positionIndex = positionIndex;
        this.element = this.createDiceElement();

        // Stats based on type and pips
        this.baseDamage = 5;
        this.baseAttackSpeed = 1000; // milliseconds per attack
        this.range = 1; // Grid cells (for simplicity, same row)
        this.attackDelay = 0; // Time until next attack

        this.updateStats();
        this.render();
    }

    createDiceElement() {
        const diceEl = document.createElement('div');
        diceEl.classList.add('dice', this.type, this.rarity);
        diceEl.dataset.index = this.positionIndex;
        diceEl.dataset.type = this.type;
        diceEl.dataset.pips = this.pips;
        diceEl.draggable = true; // For merging and repositioning

        const pipsEl = document.createElement('div');
        pipsEl.classList.add('dice-pips');
        pipsEl.textContent = this.pips;

        const rarityEl = document.createElement('div');
        rarityEl.classList.add('dice-rarity');
        // rarityEl.textContent = this.rarity.charAt(0).toUpperCase() + this.rarity.slice(1); // Capitalize first letter

        diceEl.appendChild(pipsEl);
        // diceEl.appendChild(rarityEl); // Hide rarity text for now, use color for type

        // Add event listeners for selection and dragging
        diceEl.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent cell click event
            this.game.selectDice(this.positionIndex);
        });
        diceEl.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            this.game.selectedDiceForDrag = this.positionIndex;
            diceEl.classList.add('dragging');
            // Store data for drag and drop (e.g., index)
            e.dataTransfer.setData('text/plain', this.positionIndex);
        });
        diceEl.addEventListener('dragend', () => {
            this.game.selectedDiceForDrag = null;
            diceEl.classList.remove('dragging');
        });

        return diceEl;
    }

    updateStats() {
        this.damage = this.baseDamage * this.pips * this.game.globalDamageMultiplier;
        // Basic attack speed scaling: 1 pip = 1 attack/sec, 7 pips = 7 attacks/sec
        this.attackSpeed = this.baseAttackSpeed / this.pips;
        
        // Type-specific adjustments (for future expansion)
        if (this.type === 'speed') {
            this.attackSpeed *= 0.5; // Faster attack
        } else if (this.type === 'poison') {
            this.damage *= 0.7; // Lower direct damage, but will add DoT later
        }
    }

    render() {
        // Update element classes and content
        this.element.className = ''; // Clear existing classes
        this.element.classList.add('dice', this.type, this.rarity);
        this.element.dataset.type = this.type;
        this.element.dataset.pips = this.pips;
        this.element.querySelector('.dice-pips').textContent = this.pips;
        // if (this.element.querySelector('.dice-rarity')) {
        //     this.element.querySelector('.dice-rarity').textContent = this.rarity.charAt(0).toUpperCase() + this.rarity.slice(1);
        // }
        
        // Append to current cell
        const targetCell = this.game.boardElement.children[this.positionIndex];
        if (targetCell && !this.element.parentElement) { // Only append if not already in DOM or in wrong place
            targetCell.appendChild(this.element);
        }
    }

    attack(deltaTime) {
        this.attackDelay -= deltaTime;
        if (this.attackDelay <= 0) {
            const enemiesInRange = this.game.enemies.filter(enemy => this.isInRange(enemy));
            if (enemiesInRange.length > 0) {
                // Attack the closest enemy for now
                const targetEnemy = enemiesInRange.reduce((prev, current) => 
                    (prev.positionIndex > current.positionIndex) ? prev : current
                ); 
                targetEnemy.takeDamage(this.damage);
                this.game.showAttackAnimation(this, targetEnemy);
                this.attackDelay = this.attackSpeed;
            }
        }
    }

    isInRange(enemy) {
        const diceRow = Math.floor(this.positionIndex / this.game.gridCols);
        const diceCol = this.positionIndex % this.game.gridCols;

        const enemyCell = this.game.boardElement.children[enemy.positionIndex];
        if (!enemyCell) return false; // Enemy might have been removed

        const enemyRow = Math.floor(enemy.positionIndex / this.game.gridCols);
        const enemyCol = enemy.positionIndex % this.game.gridCols;
        
        // Simple range check: same row, and enemy is to the right of or on the same column as the dice
        return diceRow === enemyRow && enemyCol >= diceCol && (enemyCol - diceCol <= this.range);
    }
}

// --- Enemy Class ---
class Enemy {
    constructor(id, type, hp, speed, path, game) {
        this.id = id;
        this.game = game;
        this.type = type;
        this.maxHp = hp;
        this.currentHp = hp;
        this.speed = speed; // Pixels per second
        this.path = path; // Array of grid indices
        this.pathIndex = 0; // Current index in the path array
        this.positionIndex = path[0]; // Current grid cell index
        this.element = this.createEnemyElement();
        this.value = 10; // SP gained on defeat

        // Precise position within the current cell (0 = start, 1 = end)
        this.progressInCell = 0; 
        
        this.render();
    }

    createEnemyElement() {
        const enemyEl = document.createElement('div');
        enemyEl.classList.add('enemy', this.type);

        const hpBar = document.createElement('div');
        hpBar.classList.add('enemy-hp-bar');
        const hpFill = document.createElement('div');
        hpFill.classList.add('enemy-hp-bar-fill');
        hpBar.appendChild(hpFill);
        enemyEl.appendChild(hpBar);

        return enemyEl;
    }

    render() {
        // Position enemy based on current cell and progress within it
        const currentCell = this.game.boardElement.children[this.positionIndex];
        const nextCell = this.game.boardElement.children[this.path[this.pathIndex + 1]];

        let targetX, targetY;

        if (currentCell) {
            const currentRect = currentCell.getBoundingClientRect();
            const boardRect = this.game.boardElement.getBoundingClientRect();

            let currentCenterX = currentRect.left - boardRect.left + currentRect.width / 2;
            let currentCenterY = currentRect.top - boardRect.top + currentRect.height / 2;

            if (nextCell && this.pathIndex + 1 < this.path.length) {
                const nextRect = nextCell.getBoundingClientRect();
                let nextCenterX = nextRect.left - boardRect.left + nextRect.width / 2;
                let nextCenterY = nextRect.top - boardRect.top + nextRect.height / 2;

                targetX = currentCenterX + (nextCenterX - currentCenterX) * this.progressInCell;
                targetY = currentCenterY + (nextCenterY - currentCenterY) * this.progressInCell;
            } else {
                // At the last cell or path is finished
                targetX = currentCenterX;
                targetY = currentCenterY;
            }

            this.element.style.left = `${targetX - (this.element.offsetWidth / 2)}px`;
            this.element.style.top = `${targetY - (this.element.offsetHeight / 2)}px`;
            
            // Update HP bar
            const hpFill = this.element.querySelector('.enemy-hp-bar-fill');
            if (hpFill) {
                hpFill.style.width = `${(this.currentHp / this.maxHp) * 100}%`;
            }
        }
        if (!this.element.parentElement) {
            this.game.gameAreaElement.appendChild(this.element);
        }
    }

    move(deltaTime) {
        if (this.currentHp <= 0 || this.finishedPath) return;

        const distanceToMove = this.speed * deltaTime / 1000; // Pixels to move
        const currentCell = this.game.boardElement.children[this.positionIndex];

        if (!currentCell) { // If cell doesn't exist, remove enemy
            this.finishedPath = true; // Mark as finished path so it's cleaned up
            this.game.removeEnemy(this);
            return;
        }

        const cellSize = currentCell.offsetWidth; // Assuming square cells

        this.progressInCell += distanceToMove / cellSize;

        if (this.progressInCell >= 1) {
            this.pathIndex++;
            if (this.pathIndex < this.path.length) {
                this.positionIndex = this.path[this.pathIndex];
                this.progressInCell = 0; // Reset progress for new cell
                // Don't render here, render in main loop to prevent excessive DOM updates
            } else {
                // Reached end of path
                this.finishedPath = true;
                this.game.loseHp(1); // Lose 1 HP
                this.game.removeEnemy(this);
            }
        }
        this.render(); // Always render to update position, even mid-cell
    }

    takeDamage(amount) {
        this.currentHp -= amount;
        if (this.currentHp <= 0) {
            this.currentHp = 0; // Ensure HP doesn't go negative for display
            this.game.gainSp(this.value);
            this.game.removeEnemy(this);
        }
        this.render();
    }
}

// --- Main Game Class ---
class DiceDefenseGame {
    constructor() {
        // UI Elements
        this.spDisplay = document.getElementById('sp-value');
        this.waveDisplay = document.getElementById('wave-value');
        this.hpDisplay = document.getElementById('hp-value');
        this.gameLevelDisplay = document.getElementById('game-level-value');
        this.summonCostDisplay = document.getElementById('summon-cost');
        this.levelUpCostDisplay = document.getElementById('level-up-cost');
        this.summonBtn = document.getElementById('summon-dice-btn');
        this.levelUpBtn = document.getElementById('level-up-game-btn');
        this.boardElement = document.getElementById('game-board');
        this.gameAreaElement = document.getElementById('game-area');
        this.messageArea = document.getElementById('message-area');
        this.startOverlay = document.getElementById('start-overlay');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.restartGameBtn = document.getElementById('restart-game-btn');
        this.finalScore = document.getElementById('final-score');

        // Game State
        this.gridRows = 3;
        this.gridCols = 5;
        this.maxDice = this.gridRows * this.gridCols;
        this.dice = new Array(this.maxDice).fill(null); // Array to hold Dice objects
        this.enemies = []; // Array to hold Enemy objects
        this.enemyPath = []; // Path for enemies (grid indices)
        this.diceTypes = ['attack', 'speed', 'poison']; // Defined dice types
        this.rarities = ['normal', 'rare', 'heroic', 'legendary']; // For future use

        this.sp = 100;
        this.hp = 20;
        this.wave = 0;
        this.gameLevel = 1;
        this.globalDamageMultiplier = 1; // Derived from gameLevel
        this.summonCost = 10;
        this.levelUpCosts = { 1: 100, 2: 200, 3: 400, 4: 700 }; // SP for game level up (1->2, 2->3, 3->4, 4->MAX)

        this.selectedDiceIndex = null; // For merging (click-based)
        this.selectedDiceForDrag = null; // For dragging

        this.gameStarted = false;
        this.gameOver = false;
        this.lastUpdateTime = 0;
        this.animationFrameId = null; // To control requestAnimationFrame

        // Wave management
        this.enemiesPerWave = 5;
        this.waveDuration = 15000; // 15 seconds
        this.enemySpawnInterval = 2000; // Every 2 seconds
        this.lastEnemySpawnTime = 0;
        this.enemiesSpawnedInWave = 0;

        this.init();
    }

    init() {
        this.createBoard();
        this.generateEnemyPath();
        this.addEventListeners();
        this.updateUI();
        this.startOverlay.style.display = 'flex';
        this.gameOverOverlay.style.display = 'none';
        this.messageArea.textContent = '';
    }

    createBoard() {
        this.boardElement.innerHTML = ''; // Clear previous board
        for (let i = 0; i < this.maxDice; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('dragover', (e) => e.preventDefault()); // Allow drop
            cell.addEventListener('drop', (e) => this.handleDrop(e, i));
            this.boardElement.appendChild(cell);
        }
    }

    generateEnemyPath() {
        // Path: right across the middle row (row index 1)
        const middleRowStartIndex = this.gridCols; // Index 5 for 5x3 grid
        this.enemyPath = [];
        for (let i = 0; i < this.gridCols; i++) {
            this.enemyPath.push(middleRowStartIndex + i);
            // Add 'path' class to cells to visualize the path
            this.boardElement.children[middleRowStartIndex + i].classList.add('path');
        }
    }

    addEventListeners() {
        this.summonBtn.addEventListener('click', () => this.summonDice());
        this.levelUpBtn.addEventListener('click', () => this.levelUpGame());
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.restartGameBtn.addEventListener('click', () => this.restartGame());
    }

    startGame() {
        this.gameStarted = true;
        this.startOverlay.style.display = 'none';
        this.lastUpdateTime = performance.now();
        this.startWave();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(currentTime) {
        if (!this.gameStarted || this.gameOver) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            return;
        }

        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        // Spawn enemies for current wave
        if (this.enemiesSpawnedInWave < this.enemiesPerWave && currentTime - this.lastEnemySpawnTime > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawnTime = currentTime;
            this.enemiesSpawnedInWave++;
        }

        // Move enemies and render
        this.enemies.forEach(enemy => enemy.move(deltaTime));

        // Dice attacks
        this.dice.forEach(dice => {
            if (dice) dice.attack(deltaTime);
        });

        // Clean up defeated/finished enemies from array and DOM
        this.enemies = this.enemies.filter(enemy => enemy.currentHp > 0 && !enemy.finishedPath);

        // Check for wave end
        if (this.enemiesSpawnedInWave >= this.enemiesPerWave && this.enemies.length === 0) {
            this.endWave();
        }
        
        this.updateUI();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    summonDice() {
        if (this.gameOver) return;
        if (this.sp < this.summonCost) {
            this.showMessage('SP가 부족합니다!', 'error');
            return;
        }
        const currentDiceCount = this.dice.filter(d => d !== null).length;
        if (currentDiceCount >= this.maxDice) {
            this.showMessage('더 이상 배치할 공간이 없습니다!', 'error');
            return;
        }

        const emptyCells = this.dice.map((d, i) => d === null ? i : -1).filter(i => i !== -1);
        if (emptyCells.length === 0) { // Should not happen if currentDiceCount < maxDice, but for safety
            this.showMessage('더 이상 배치할 공간이 없습니다!', 'error');
            return;
        }

        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        
        this.sp -= this.summonCost;
        this.summonCost += 10;
        
        const randomType = this.diceTypes[Math.floor(Math.random() * this.diceTypes.length)];
        // Rarity is 'normal' for now, can add logic for higher rarity later
        const newDice = new Dice(randomType, 1, 'normal', randomIndex, this); // Always start with 1 pip
        this.dice[randomIndex] = newDice;
        
        this.showMessage('주사위 소환!', 'success');
        this.updateUI();
    }

    levelUpGame() {
        if (this.gameOver) return;
        const currentLevelUpCost = this.levelUpCosts[this.gameLevel];
        if (!currentLevelUpCost) {
            this.showMessage('최대 레벨입니다!', 'info');
            return;
        }
        if (this.sp < currentLevelUpCost) {
            this.showMessage('SP가 부족합니다!', 'error');
            return;
        }

        this.sp -= currentLevelUpCost;
        this.gameLevel++;
        this.globalDamageMultiplier = 1 + (this.gameLevel - 1) * 0.1; // Example: +10% damage per game level
        
        // Update all existing dice with new global multiplier
        this.dice.forEach(dice => {
            if (dice) dice.updateStats();
        });
        this.showMessage(`게임 레벨 ${this.gameLevel} 달성!`, 'success');
        this.updateUI();
    }

    selectDice(index) {
        if (this.gameOver) return;
        if (this.selectedDiceIndex === index) {
            // Deselect
            this.boardElement.children[index].querySelector('.dice').classList.remove('selected');
            this.selectedDiceIndex = null;
        } else if (this.selectedDiceIndex !== null) {
            // Attempt to merge
            this.mergeDice(this.selectedDiceIndex, index);
            if (this.selectedDiceIndex !== null) { // Might be cleared if merge successful
                this.boardElement.children[this.selectedDiceIndex].querySelector('.dice')?.classList.remove('selected');
            }
            this.selectedDiceIndex = null;
        } else {
            // Select new dice
            if (this.dice[index]) {
                this.boardElement.children[index].querySelector('.dice').classList.add('selected');
                this.selectedDiceIndex = index;
            } else {
                // Clicking an empty cell clears selection
                this.selectedDiceIndex = null;
            }
        }
    }

    handleDrop(event, targetIndex) {
        event.preventDefault();
        const draggedDiceIndex = parseInt(event.dataTransfer.getData('text/plain'));

        if (draggedDiceIndex !== null && draggedDiceIndex !== targetIndex) {
            if (this.dice[targetIndex] === null) {
                // Reposition if target is empty
                this.repositionDice(draggedDiceIndex, targetIndex);
            } else {
                // Attempt to merge if target has a dice
                this.mergeDice(draggedDiceIndex, targetIndex);
            }
        }
        this.selectedDiceForDrag = null; // Clear drag selection
    }

    repositionDice(fromIndex, toIndex) {
        const diceToMove = this.dice[fromIndex];
        if (diceToMove) {
            // Clear selection of moved dice if it was selected
            this.boardElement.children[fromIndex].querySelector('.dice')?.classList.remove('selected');
            if (this.selectedDiceIndex === fromIndex) {
                this.selectedDiceIndex = null;
            }

            this.dice[toIndex] = diceToMove;
            this.dice[fromIndex] = null;
            diceToMove.positionIndex = toIndex;
            diceToMove.render(); // Re-render to update DOM position
            
            // Clear the old cell visually if not already empty (should be handled by dice.render)
            // this.boardElement.children[fromIndex].innerHTML = ''; 
            this.showMessage('주사위 위치 이동', 'info');
        }
    }

    mergeDice(sourceIndex, targetIndex) {
        const sourceDice = this.dice[sourceIndex];
        const targetDice = this.dice[targetIndex];

        if (!sourceDice || !targetDice) return;
        if (this.gameOver) return;

        // Ensure source and target are different indices
        if (sourceIndex === targetIndex) return;

        // Check merge conditions
        if (sourceDice.type === targetDice.type && sourceDice.pips === targetDice.pips && sourceDice.pips < 7) {
            // Valid merge
            this.boardElement.children[sourceIndex].innerHTML = ''; // Remove source dice element
            this.dice[sourceIndex] = null; // Clear source dice from array

            this.boardElement.children[targetIndex].innerHTML = ''; // Remove target dice element
            this.dice[targetIndex] = null; // Clear target dice from array

            // Create new dice with +1 pips, random type, same rarity, at target location
            const newPips = sourceDice.pips + 1;
            const randomType = this.diceTypes[Math.floor(Math.random() * this.diceTypes.length)];
            const newDice = new Dice(randomType, newPips, sourceDice.rarity, targetIndex, this);
            this.dice[targetIndex] = newDice;
            newDice.updateStats(); // Apply game level multiplier immediately
            this.showMessage(`주사위 합성! ${newPips} 눈금 ${randomType}`, 'success');
            
        } else {
            this.showMessage('같은 종류, 같은 눈금만 합성 가능합니다!', 'error');
        }
        this.updateUI();
    }

    spawnEnemy() {
        const enemyHp = 10 + this.wave * 3;
        const enemySpeed = 30 + (this.wave * 2); // Pixels per second
        // For simplicity, all enemies are 'basic' type now
        const newEnemy = new Enemy(Date.now() + Math.random(), 'basic', enemyHp, enemySpeed, this.enemyPath, this);
        this.enemies.push(newEnemy);
    }

    removeEnemy(enemy) {
        if (enemy.element && enemy.element.parentElement) {
            enemy.element.parentElement.removeChild(enemy.element);
        }
        this.enemies = this.enemies.filter(e => e.id !== enemy.id);
    }

    showAttackAnimation(dice, targetEnemy) {
        // Create a temporary element for the attack animation
        const attackEl = document.createElement('div');
        attackEl.classList.add('attack-animation');
        this.gameAreaElement.appendChild(attackEl);

        const diceRect = dice.element.getBoundingClientRect();
        const enemyRect = targetEnemy.element.getBoundingClientRect();
        const gameAreaRect = this.gameAreaElement.getBoundingClientRect();

        // Start from center of dice
        attackEl.style.left = `${(diceRect.left + diceRect.width / 2) - gameAreaRect.left}px`;
        attackEl.style.top = `${(diceRect.top + diceRect.height / 2) - gameAreaRect.top}px`;

        // Move towards enemy
        // For a simple animation, just scale/fade out from dice position
        // For a projectile, would calculate trajectory
        attackEl.style.width = '10px';
        attackEl.style.height = '10px';
        
        setTimeout(() => {
            if (attackEl.parentElement) {
                attackEl.parentElement.removeChild(attackEl);
            }
        }, 200); // Animation duration
    }

    startWave() {
        this.wave++;
        this.enemiesSpawnedInWave = 0;
        this.lastEnemySpawnTime = performance.now();
        this.showMessage(`웨이브 ${this.wave} 시작!`, 'info');
        // Increase enemies per wave based on current wave
        this.enemiesPerWave = 5 + this.wave * 2; 
        this.enemySpawnInterval = Math.max(500, 2000 - this.wave * 100); // Spawn faster
    }

    endWave() {
        this.showMessage(`웨이브 ${this.wave} 클리어!`, 'success');
        this.gainSp(this.wave * 20); // Bonus SP for wave clear
        
        // Wait a bit before next wave starts
        setTimeout(() => {
            if (!this.gameOver) { // Ensure game hasn't ended during wait
                this.startWave();
            }
        }, 3000); // 3 seconds break between waves
    }

    loseHp(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.triggerGameOver();
        }
        this.updateUI();
    }

    gainSp(amount) {
        this.sp += amount;
        this.showMessage(`SP +${amount}`, 'info');
        this.updateUI();
    }

    showMessage(text, type = 'info') {
        this.messageArea.textContent = text;
        this.messageArea.className = `message ${type}`;
        this.messageArea.style.opacity = 1;
        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            this.messageArea.style.opacity = 0;
        }, 2000);
    }

    triggerGameOver() {
        this.gameOver = true;
        this.finalScore.textContent = `최종 웨이브: ${this.wave}`;
        this.gameOverOverlay.style.display = 'flex';
        this.showMessage('게임 오버!', 'error');
        cancelAnimationFrame(this.animationFrameId); // Stop game loop
        this.animationFrameId = null;
    }

    restartGame() {
        // Reset all game state
        this.dice.forEach(d => { if (d && d.element && d.element.parentElement) d.element.parentElement.removeChild(d.element); });
        this.enemies.forEach(e => { if (e && e.element && e.element.parentElement) e.element.parentElement.removeChild(e.element); });
        this.dice = new Array(this.maxDice).fill(null);
        this.enemies = [];
        this.sp = 100;
        this.hp = 20;
        this.wave = 0;
        this.gameLevel = 1;
        this.globalDamageMultiplier = 1;
        this.summonCost = 10;
        this.selectedDiceIndex = null;
        this.selectedDiceForDrag = null;
        this.gameStarted = false;
        this.gameOver = false;
        this.lastUpdateTime = 0;
        this.animationFrameId = null;
        this.enemiesSpawnedInWave = 0;
        
        this.init(); // Re-initialize game to start fresh
    }

    updateUI() {
        this.spDisplay.textContent = this.sp;
        this.waveDisplay.textContent = this.wave;
        this.hpDisplay.textContent = this.hp;
        this.gameLevelDisplay.textContent = this.gameLevel;
        this.summonCostDisplay.textContent = this.summonCost;
        
        const nextLevelCost = this.levelUpCosts[this.gameLevel];
        if (nextLevelCost) {
            this.levelUpCostDisplay.textContent = nextLevelCost;
            this.levelUpBtn.disabled = this.sp < nextLevelCost;
        } else {
            this.levelUpCostDisplay.textContent = 'MAX';
            this.levelUpBtn.disabled = true;
        }

        this.summonBtn.disabled = this.sp < this.summonCost || this.dice.filter(d => d !== null).length >= this.maxDice;
    }
}

new DiceDefenseGame();
