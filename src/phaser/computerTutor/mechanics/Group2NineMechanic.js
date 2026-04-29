export default class Group2NineMechanic {
    /**
     * @param {Phaser.Scene} scene 
     * @param {RetroGrid} grid 
     * @param {Object} data - Datos calculados por AreaModelCalculator
     */
    constructor(scene, grid, data) {
        this.scene = scene;
        this.grid = grid;
        this.data = data;
        
        this.factor = data.base.columns;
        this.isComplete = false;
        
        this.init();
    }

    init() {
        console.log('Mechanic: Group 2 Nine (Subtraction) started.');
        this.grid.autoActivate = false;
        
        // Pre-llenar la grilla de 10xN
        for (let r = 0; r < 10; r++) {
            this.grid.activateRow(r);
        }
        
        this.createDimensionGuides();
        this.highlightRemovableRow();
    }

    createDimensionGuides() {
        const cellSize = this.grid.cellSize;
        const rows = this.grid.rows;
        const cols = this.grid.cols;
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(1, 0x00ff00, 0.6);
        
        // 1. Cota Vertical (Derecha)
        const vX = (cols * cellSize) + 20;
        graphics.lineBetween(vX - 5, 0, vX + 5, 0);
        graphics.lineBetween(vX, 0, vX, rows * cellSize);
        graphics.lineBetween(vX - 5, rows * cellSize, vX + 5, rows * cellSize);
        
        const vText = this.scene.add.text(vX, (rows * cellSize) / 2, rows.toString(), {
            font: '14px monospace', fill: '#00ff00', backgroundColor: '#000500', padding: { x: 2, y: 2 }
        }).setOrigin(0.5);
        this.grid.add(vText);

        // 2. Cota Horizontal (Abajo)
        const hY = (rows * cellSize) + 20;
        graphics.lineBetween(0, hY - 5, 0, hY + 5);
        graphics.lineBetween(0, hY, cols * cellSize, hY);
        graphics.lineBetween(cols * cellSize, hY - 5, cols * cellSize, hY + 5);

        const hText = this.scene.add.text((cols * cellSize) / 2, hY, cols.toString(), {
            font: '14px monospace', fill: '#00ff00', backgroundColor: '#000500', padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        this.grid.add(hText);

        this.grid.add(graphics);
    }

    highlightRemovableRow() {
        const row = 9; // La fila 10 (indice 9)
        const x = 0;
        const y = row * this.grid.cellSize;
        const w = this.factor * this.grid.cellSize;
        const h = this.grid.cellSize;

        this.focusRect = this.scene.add.graphics();
        this.focusRect.lineStyle(2, 0x00ff00, 0.8);
        this.focusRect.strokeRect(x, y, w, h);
        
        this.grid.add(this.focusRect);

        // Texto de ayuda flotante
        this.helpText = this.scene.add.text(w + 10, y + h/2, 'QUITAR ESTA FILA', {
            font: '12px monospace',
            fill: '#00ff00'
        }).setOrigin(0, 0.5);
        this.grid.add(this.helpText);

        // Animacion
        this.scene.tweens.add({
            targets: [this.focusRect, this.helpText],
            alpha: { from: 0.3, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    update() {
        if (this.isComplete) return;
        // ... (resto de lógica si hubiera)
    }

    // El usuario interactua con la grilla. El Scene llama a este metodo.
    onRowClick(row) {
        if (row === 9 && !this.isComplete) {
            this.grid.removeRow(9);
            this.isComplete = true;
            this.onSuccess();
        }
    }

    onSuccess() {
        console.log('Mechanic: Nine subtraction complete!');
        if (this.focusRect) this.focusRect.destroy();
        if (this.helpText) this.helpText.destroy();

        // Mostrar la formula final completa
        if (this.scene.formulaPanel) {
            this.scene.formulaPanel.setFormula(this.data.formula);
        }

        this.scene.tweens.add({
            targets: this.grid,
            x: this.grid.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 5
        });
    }

    destroy() {
        if (this.focusRect) this.focusRect.destroy();
        if (this.helpText) this.helpText.destroy();
    }
}
