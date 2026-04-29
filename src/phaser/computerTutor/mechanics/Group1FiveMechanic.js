export default class Group1FiveMechanic {
    /**
     * @param {Phaser.Scene} scene 
     * @param {RetroGrid} grid 
     * @param {Object} data - Datos calculados por AreaModelCalculator
     */
    constructor(scene, grid, data) {
        this.scene = scene;
        this.grid = grid;
        this.data = data;
        
        this.steps = data.steps;
        this.currentStep = 0;
        this.isComplete = false;
        
        // Determinar modo: si hay 5 filas, contamos columnas. Si hay 5 columnas, contamos filas.
        this.mode = (grid.rows === 5) ? 'column' : 'row';
        
        this.init();
    }

    init() {
        console.log(`Mechanic: Group 1 Five (Skip Counting) started. Mode: ${this.mode}`);
        this.grid.autoActivate = false;
        if (this.scene.formulaPanel) {
            this.scene.formulaPanel.setFormula(`TOQUE LAS GUÍAS "${this.mode === 'column' ? 'V' : '>'}" PARA CONTAR`);
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
        const rows = this.grid.rows;
        const cols = this.grid.cols;
        let x, y, w, h;

        if (this.mode === 'column') {
            x = this.currentStep * cellSize;
            y = 0;
            w = cellSize;
            h = rows * cellSize;
        } else {
            x = 0;
            y = this.currentStep * cellSize;
            w = cols * cellSize;
            h = cellSize;
        }

        if (this.focusRect) this.focusRect.destroy();
        this.focusRect = this.scene.add.graphics();
        this.focusRect.lineStyle(2, 0x00ff00, 0.8);
        this.focusRect.strokeRect(x, y, w, h);
        this.grid.add(this.focusRect);

        // Animación de respiración para el foco
        this.scene.tweens.add({
            targets: this.focusRect,
            alpha: { from: 0.4, to: 1 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    onColumnClick(col) {
        if (this.mode === 'column' && col === this.currentStep && !this.isComplete) {
            this.advance();
        }
    }

    onRowClick(row) {
        if (this.mode === 'row' && row === this.currentStep && !this.isComplete) {
            this.advance();
        }
    }

    advance() {
        // Activar visualmente la fila o columna
        if (this.mode === 'column') {
            this.grid.activateColumn(this.currentStep);
        } else {
            this.grid.activateRow(this.currentStep);
        }

        this.currentStep++;
        
        // Actualizar UI con la secuencia (5, 10, 15...)
        if (this.scene.formulaPanel) {
            const currentSequence = this.data.sequence.slice(0, this.currentStep);
            this.scene.formulaPanel.setFormula(`CONTANDO: ${currentSequence.join(', ')}`);
        }

        if (this.currentStep >= this.steps) {
            this.onSuccess();
        } else {
            this.highlightNext();
        }
    }

    onSuccess() {
        this.isComplete = true;
        console.log('Mechanic: Five skip counting complete!');
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
