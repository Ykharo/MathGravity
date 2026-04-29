export default class Group1TwoMechanic {
    /**
     * @param {Phaser.Scene} scene 
     * @param {RetroGrid} grid 
     * @param {Object} data - Datos calculados por AreaModelCalculator
     */
    constructor(scene, grid, data) {
        this.scene = scene;
        this.grid = grid;
        this.data = data;
        
        this.currentStep = 0;
        this.isComplete = false;
        
        // Modo: si hay 2 filas, contamos filas. Si hay 2 columnas, contamos columnas.
        this.mode = (grid.rows === 2) ? 'row' : 'column';
        
        this.init();
    }

    init() {
        console.log(`Mechanic: Group 1 Two (Double) started. Mode: ${this.mode}`);
        this.grid.autoActivate = false;
        if (this.scene.formulaPanel) {
            this.scene.formulaPanel.setFormula(`PISTA: ${this.data.hint.toUpperCase()}`);
        }
        this.createDimensionGuides();
        this.highlightNext();
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

    highlightNext() {
        if (this.isComplete) return;

        const cellSize = this.grid.cellSize;
        let x, y, w, h;

        if (this.mode === 'row') {
            x = 0;
            y = this.currentStep * cellSize;
            w = this.grid.cols * cellSize;
            h = cellSize;
        } else {
            x = this.currentStep * cellSize;
            y = 0;
            w = cellSize;
            h = this.grid.rows * cellSize;
        }

        if (this.focusRect) this.focusRect.destroy();
        this.focusRect = this.scene.add.graphics();
        this.focusRect.lineStyle(2, 0x00ff00, 0.8);
        this.focusRect.strokeRect(x, y, w, h);
        this.grid.add(this.focusRect);

        this.scene.tweens.add({
            targets: this.focusRect,
            alpha: { from: 0.4, to: 1 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    onRowClick(row) {
        if (this.mode === 'row' && row === this.currentStep && !this.isComplete) {
            this.advance();
        }
    }

    onColumnClick(col) {
        if (this.mode === 'column' && col === this.currentStep && !this.isComplete) {
            this.advance();
        }
    }

    advance() {
        // Activar visualmente
        if (this.mode === 'row') {
            this.grid.activateRow(this.currentStep);
        } else {
            this.grid.activateColumn(this.currentStep);
        }

        this.currentStep++;
        
        if (this.scene.formulaPanel) {
            if (this.currentStep === 1) {
                this.scene.formulaPanel.setFormula(`PROGRESO: ${this.data.factor}`);
            }
        }

        if (this.currentStep >= 2) {
            this.onSuccess();
        } else {
            this.highlightNext();
        }
    }

    onSuccess() {
        this.isComplete = true;
        console.log('Mechanic: Two double complete!');
        if (this.focusRect) this.focusRect.destroy();

        // Mostrar la fórmula final completa
        if (this.scene.formulaPanel) {
            this.scene.formulaPanel.setFormula(this.data.formula);
        }

        // Efecto visual de éxito
        this.scene.tweens.add({
            targets: this.grid,
            scale: { from: 1, to: 1.05 },
            duration: 200,
            yoyo: true
        });
    }

    update() {
        // No requiere logica adicional por frame
    }

    destroy() {
        if (this.focusRect) this.focusRect.destroy();
    }
}
