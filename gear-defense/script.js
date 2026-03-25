class GearDefense {
    constructor() {
        this.board = document.getElementById('game-board');
        this.goldDisplay = document.getElementById('gold');
        this.summonCostDisplay = document.getElementById('summon-cost');
        this.summonBtn = document.getElementById('summon-btn');

        this.gridSize = 4;
        this.gears = new Array(this.gridSize * this.gridSize).fill(null);
        this.gold = 100;
        this.summonCost = 10;
        
        this.init();
    }

    init() {
        this.createBoard();
        this.updateUI();

        this.summonBtn.addEventListener('click', () => this.summonGear());
    }

    createBoard() {
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            
            // 맨 마지막 칸을 기본 톱니바퀴 자리로 설정
            if (i === this.gridSize * this.gridSize - 1) {
                cell.classList.add('base');
            }
            
            this.board.appendChild(cell);
        }
    }

    summonGear() {
        if (this.gold < this.summonCost) {
            console.log("골드가 부족합니다.");
            return;
        }

        const emptyCells = this.gears.map((gear, index) => gear === null ? index : -1)
                                      .filter(index => index !== -1 && index !== this.gears.length -1);
        
        if (emptyCells.length === 0) {
            console.log("톱니바퀴를 배치할 공간이 없습니다.");
            return;
        }

        this.gold -= this.summonCost;
        
        // TODO: 무작위 톱니바퀴 생성 로직 추가
        const newGear = {
            type: 'basic',
            teeth: 1,
            rarity: 'normal',
        };

        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.gears[randomIndex] = newGear;
        
        this.summonCost += 10;

        this.render();
        this.updateUI();
    }
    
    render() {
        this.board.querySelectorAll('.gear').forEach(g => g.remove());
        this.gears.forEach((gear, index) => {
            if (gear) {
                const gearElement = document.createElement('div');
                gearElement.classList.add('gear');
                // TODO: 톱니바퀴 종류/등급/개수에 따른 시각적 표현
                gearElement.textContent = gear.teeth;
                gearElement.style.backgroundColor = 'gray';

                this.board.children[index].appendChild(gearElement);
            }
        });
    }

    updateUI() {
        this.goldDisplay.textContent = this.gold;
        this.summonCostDisplay.textContent = this.summonCost;
    }
}

new GearDefense();
