class WaterSortGame {
    constructor() {
        this.stage = 1;
        this.bottles = [];
        this.selectedBottleIndex = null;
        this.capacity = 4;
        this.colors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', 
            '#9b59b6', '#e67e22', '#1abc9c', '#34495e',
            '#d35400', '#27ae60', '#2980b9', '#8e44ad'
        ];
        
        this.container = document.getElementById('bottles-container');
        this.scoreElement = document.getElementById('score');
        this.messageElement = document.getElementById('message');
        this.resetBtn = document.getElementById('reset-btn');
        this.startBtn = document.getElementById('start-btn');
        this.overlay = document.getElementById('start-overlay');

        this.init();
    }

    init() {
        this.startBtn.addEventListener('click', () => {
            this.overlay.style.display = 'none';
            this.startStage();
        });

        this.resetBtn.addEventListener('click', () => {
            this.startStage();
        });
    }

    startStage() {
        this.selectedBottleIndex = null;
        this.messageElement.textContent = '';
        this.scoreElement.textContent = `Stage: ${this.stage}`;
        
        // 난이도 공식: 
        // 스테이지 1-2: 색상 3개, 빈 병 2개 (총 5병)
        // 스테이지 3-4: 색상 4개, 빈 병 2개 (총 6병)
        // 점진적으로 증가
        const colorCount = Math.min(3 + Math.floor((this.stage - 1) / 2), this.colors.length);
        const emptyBottleCount = 2;
        const totalBottles = colorCount + emptyBottleCount;

        this.generateLevel(colorCount, totalBottles);
        this.render();
    }

    generateLevel(colorCount, totalBottles) {
        let allLiquids = [];
        for (let i = 0; i < colorCount; i++) {
            for (let j = 0; j < this.capacity; j++) {
                allLiquids.push(this.colors[i]);
            }
        }

        // 셔플
        for (let i = allLiquids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allLiquids[i], allLiquids[j]] = [allLiquids[j], allLiquids[i]];
        }

        this.bottles = [];
        for (let i = 0; i < colorCount; i++) {
            this.bottles.push(allLiquids.slice(i * this.capacity, (i + 1) * this.capacity));
        }
        for (let i = 0; i < totalBottles - colorCount; i++) {
            this.bottles.push([]);
        }
    }

    render() {
        this.container.innerHTML = '';
        this.bottles.forEach((liquids, index) => {
            const bottle = document.createElement('div');
            bottle.className = 'bottle';
            if (this.selectedBottleIndex === index) bottle.classList.add('selected');
            
            // 병 안의 액체 그리기
            liquids.forEach(color => {
                const liquid = document.createElement('div');
                liquid.className = 'liquid';
                liquid.style.backgroundColor = color;
                bottle.appendChild(liquid);
            });

            bottle.addEventListener('click', () => this.handleBottleClick(index));
            this.container.appendChild(bottle);
        });
    }

    handleBottleClick(index) {
        if (this.selectedBottleIndex === null) {
            // 처음 선택: 병에 액체가 있어야 함
            if (this.bottles[index].length > 0) {
                this.selectedBottleIndex = index;
            }
        } else {
            // 두 번째 선택: 다른 병이고, 비어있거나 색상이 맞아야 함
            if (this.selectedBottleIndex === index) {
                this.selectedBottleIndex = null;
            } else {
                this.moveLiquid(this.selectedBottleIndex, index);
                this.selectedBottleIndex = null;
            }
        }
        this.render();
    }

    moveLiquid(fromIndex, toIndex) {
        const fromBottle = this.bottles[fromIndex];
        const toBottle = this.bottles[toIndex];

        if (fromBottle.length === 0) return;
        if (toBottle.length === this.capacity) return;

        const liquidToMove = fromBottle[fromBottle.length - 1];

        // 규칙 검증
        if (toBottle.length > 0 && toBottle[toBottle.length - 1] !== liquidToMove) {
            return;
        }

        // 같은 색상이 연속되어 있으면 모두 이동 (빈 공간이 허용하는 한)
        let moveCount = 0;
        while (fromBottle.length > 0 && 
               fromBottle[fromBottle.length - 1] === liquidToMove && 
               toBottle.length < this.capacity) {
            toBottle.push(fromBottle.pop());
            moveCount++;
        }

        if (moveCount > 0) {
            this.checkWin();
        }
    }

    checkWin() {
        const isWin = this.bottles.every(bottle => {
            // 비어있거나, 가득 차 있고 색상이 모두 같아야 함
            if (bottle.length === 0) return true;
            if (bottle.length === this.capacity) {
                return bottle.every(color => color === bottle[0]);
            }
            return false;
        });

        if (isWin) {
            this.messageElement.textContent = '🎉 스테이지 클리어!';
            // 1초 후 다음 스테이지
            setTimeout(() => {
                this.stage++;
                this.startStage();
            }, 1000);
        }
    }
}

new WaterSortGame();
