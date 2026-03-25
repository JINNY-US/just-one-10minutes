class EvolutionRunner {
    constructor() {
        // --- UI 요소 가져오기 ---
        this.container = document.getElementById('game-canvas-container');
        this.levelDisplay = document.getElementById('level-display');
        this.scoreDisplay = document.getElementById('score-display');
        this.startMessage = document.getElementById('start-message');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.restartBtn = document.getElementById('restart-btn');

        this.init();
    }

    init() {
        // --- 상태 변수 초기화 ---
        this.playerLevel = 1;
        this.score = 0;
        this.colors = [0x00ff00, 0x0000ff, 0xff00ff, 0xffff00, 0xffa500, 0x800080, 0xff1493, 0x1e90ff];
        this.items = [];
        this.isMouseDown = false;
        this.previousMouseX = 0;
        this.trackWidth = 14;
        this.gameStarted = false;
        this.gameOver = false;
        this.initialPlayerZ = 0;

        // --- 3D 씬 설정 ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.container.appendChild(this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, 10, 5);
        this.scene.add(dirLight);
        
        const floorGeometry = new THREE.PlaneGeometry(30, 200);
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -0.5;
        this.scene.add(this.floor);

        this.player = this.createCharacter(1);
        this.initialPlayerZ = this.player.position.z;
        this.scene.add(this.player);

        if (!this.animationFrameId) {
            this.animate();
        }
        this.addEventListeners();
        this.updateUI();
    }
    
    createCharacter(level, position = {x: 0, y: 0.5, z: 0}) {
        const size = 1 + (level - 1) * 0.1;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshLambertMaterial({ color: this.colors[(level - 1) % this.colors.length] });
        const character = new THREE.Mesh(geometry, material);
        character.position.set(position.x, position.y - 0.5 + size / 2, position.z);
        character.level = level;
        return character;
    }

    addEventListeners() {
        // 기존 리스너 제거 (재시작 시 중복 방지)
        if (this.startGameHandler) {
             this.renderer.domElement.removeEventListener('mousedown', this.startGameHandler);
             this.renderer.domElement.removeEventListener('touchstart', this.startGameHandler);
        }

        this.startGameHandler = (e) => {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.startMessage.style.display = 'none';
            }
            if (this.gameOver) return;
            this.isMouseDown = true;
            this.previousMouseX = e.clientX || e.touches[0].clientX;
        };

        this.endGameHandler = () => { this.isMouseDown = false; };
        
        this.movePlayerHandler = (e) => {
            if (!this.isMouseDown || !this.gameStarted || this.gameOver) return;
            const currentX = e.clientX || e.touches[0].clientX;
            const deltaX = currentX - this.previousMouseX;
            this.previousMouseX = currentX;
            this.player.position.x += deltaX * 0.05;
            this.player.position.x = Math.max(-this.trackWidth, Math.min(this.trackWidth, this.player.position.x));
        };

        this.renderer.domElement.addEventListener('mousedown', this.startGameHandler);
        this.renderer.domElement.addEventListener('mouseup', this.endGameHandler);
        this.renderer.domElement.addEventListener('mousemove', this.movePlayerHandler);
        this.renderer.domElement.addEventListener('touchstart', this.startGameHandler);
        this.renderer.domElement.addEventListener('touchend', this.endGameHandler);
        this.renderer.domElement.addEventListener('touchmove', this.movePlayerHandler);

        window.addEventListener('resize', () => this.onWindowResize());
        this.restartBtn.onclick = () => this.restartGame();
    }
    
    restartGame() {
        this.gameOverScreen.style.display = 'none';
        
        // scene의 모든 item 제거
        this.items.forEach(item => this.scene.remove(item));
        this.scene.remove(this.player);

        // 게임 재초기화
        this.init();
    }

    spawnItems() {
        if (this.items.length < 50 && Math.random() < 0.1) {
            const level = Math.max(1, Math.floor(Math.random() * (this.playerLevel + 2) - 1));
            const position = {
                x: (Math.random() - 0.5) * this.trackWidth * 2,
                y: 0.5,
                z: this.player.position.z - 60 - (Math.random() * 60)
            };
            
            const item = this.createCharacter(level, position);
            this.items.push(item);
            this.scene.add(item);
        }
    }
    
    checkCollisions() {
        const playerBox = new THREE.Box3().setFromObject(this.player);
        
        this.items.forEach((item, index) => {
            if (this.player.position.distanceTo(item.position) < 10) {
                const itemBox = new THREE.Box3().setFromObject(item);
                if (playerBox.intersectsBox(itemBox)) {
                    if (item.level === this.playerLevel) {
                        this.playerLevel++;
                    } else {
                        this.playerLevel--;
                    }
                    
                    if (this.playerLevel < 1) {
                        this.triggerGameOver();
                    } else {
                        this.updatePlayerAppearance();
                    }
                    
                    this.scene.remove(item);
                    this.items.splice(index, 1);
                }
            }

            if (item.position.z > this.camera.position.z) {
                this.scene.remove(item);
                this.items.splice(index, 1);
            }
        });
    }

    triggerGameOver() {
        this.gameOver = true;
        this.gameOverScreen.style.display = 'flex';
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    updatePlayerAppearance() {
        const newSize = 1 + (this.playerLevel - 1) * 0.1;
        this.player.geometry = new THREE.BoxGeometry(newSize, newSize, newSize);
        this.player.material.color.set(this.colors[(this.playerLevel - 1) % this.colors.length]);
        this.player.position.y = -0.5 + newSize / 2;
    }
    
    updateUI() {
        this.levelDisplay.textContent = `Level: ${this.playerLevel}`;
        this.score = Math.floor(this.initialPlayerZ - this.player.position.z);
        this.scoreDisplay.textContent = `Score: ${this.score}`;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        if (this.gameStarted && !this.gameOver) {
            this.player.position.z -= 0.1;
            this.spawnItems();
            this.checkCollisions();
            this.updateUI();
        }
        
        this.camera.position.x = this.player.position.x * 0.2;
        this.camera.position.z = this.player.position.z + 10;
        this.camera.lookAt(this.player.position.x, 0, this.player.position.z);
        
        this.renderer.render(this.scene, this.camera);
    }
}

new EvolutionRunner();
