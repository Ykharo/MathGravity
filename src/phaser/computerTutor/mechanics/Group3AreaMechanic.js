export default class Group3AreaMechanic {
    /**
     * @param {Phaser.Scene} scene 
     * @param {RetroGrid} grid 
     * @param {Object} data - Datos calculados por AreaModelCalculator
     */
    constructor(scene, grid, data) {
        this.scene = scene;
        this.grid = grid;
        this.data = data;
        
        this.blocks = data.blocks;
        this.currentBlockIndex = 0;
        this.isComplete = false;
        
        this.init();
    }

    init() {
        console.log(`Mechanic: Group 3 Area started. Split: ${this.data.split || 'none'}`);
        this.grid.autoActivate = false; 
        this.createDimensionGuides();
        this.highlightCurrentBlock();
    }

    createDimensionGuides() {
        const cellSize = this.grid.cellSize;
        const totalRows = this.data.rows;
        const totalCols = this.data.cols;
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(1, 0x00ff00, 0.6);

        // 1. Cotas Verticales (Derecha)
        const vX = (totalCols * cellSize) + 20;
        if (this.data.split === 'rows') {
            // Dividir verticalmente en bloques de filas (Ej: 7x3 -> 5+2)
            let currentY = 0;
            this.data.blocks.forEach((block, index) => {
                const blockHeight = block.rows * cellSize;
                const vYStart = currentY;
                const vYEnd = currentY + blockHeight;

                graphics.lineBetween(vX - 5, vYStart, vX + 5, vYStart);
                graphics.lineBetween(vX, vYStart, vX, vYEnd);
                graphics.lineBetween(vX - 5, vYEnd, vX + 5, vYEnd);

                const vText = this.scene.add.text(vX, vYStart + blockHeight / 2, block.rows.toString(), {
                    font: '14px monospace', fill: '#00ff00', backgroundColor: '#000500', padding: { x: 2, y: 2 }
                }).setOrigin(0.5);
                this.grid.add(vText);
                currentY += blockHeight;
            });
        } else {
            // Cota vertical simple
            graphics.lineBetween(vX - 5, 0, vX + 5, 0);
            graphics.lineBetween(vX, 0, vX, totalRows * cellSize);
            graphics.lineBetween(vX - 5, totalRows * cellSize, vX + 5, totalRows * cellSize);
            
            const vText = this.scene.add.text(vX, (totalRows * cellSize) / 2, totalRows.toString(), {
                font: '14px monospace', fill: '#00ff00', backgroundColor: '#000500', padding: { x: 2, y: 2 }
            }).setOrigin(0.5);
            this.grid.add(vText);
        }

        // 2. Cotas Horizontales (Abajo)
        const hY = (totalRows * cellSize) + 20;
        if (this.data.split === 'columns' || !this.data.split) {
            let currentX = 0;
            this.data.blocks.forEach((block, index) => {
                const blockWidth = block.columns * cellSize;
                const hXStart = currentX;
                const hXEnd = currentX + blockWidth;

                graphics.lineBetween(hXStart, hY - 5, hXStart, hY + 5);
                graphics.lineBetween(hXStart, hY, hXEnd, hY);
                graphics.lineBetween(hXEnd, hY - 5, hXEnd, hY + 5);

                const hText = this.scene.add.text(hXStart + blockWidth / 2, hY, block.columns.toString(), {
                    font: '14px monospace', fill: '#00ff00', backgroundColor: '#000500', padding: { x: 4, y: 2 }
                }).setOrigin(0.5);
                this.grid.add(hText);
                currentX += blockWidth;
            });
        } else {
            // Cota horizontal simple
            graphics.lineBetween(0, hY - 5, 0, hY + 5);
            graphics.lineBetween(0, hY, totalCols * cellSize, hY);
            graphics.lineBetween(totalCols * cellSize, hY - 5, totalCols * cellSize, hY + 5);

            const hText = this.scene.add.text((totalCols * cellSize) / 2, hY, totalCols.toString(), {
                font: '14px monospace', fill: '#00ff00', backgroundColor: '#000500', padding: { x: 4, y: 2 }
            }).setOrigin(0.5);
            this.grid.add(hText);
        }

        this.grid.add(graphics);
    }

    highlightCurrentBlock() {
        const block = this.blocks[this.currentBlockIndex];
        
        let startRow = 0;
        let startCol = 0;
        if (this.data.split === 'columns') {
            startCol = this.currentBlockIndex === 0 ? 0 : this.blocks[0].columns;
        } else if (this.data.split === 'rows') {
            startRow = this.currentBlockIndex === 0 ? 0 : this.blocks[0].rows;
        }

        const isHatched = this.currentBlockIndex !== 0;
        this.grid.setStyles(0x00ff00, isHatched);

        if (this.focusRect) this.focusRect.destroy();
        
        const x = startCol * this.grid.cellSize;
        const y = startRow * this.grid.cellSize;
        const w = block.columns * this.grid.cellSize;
        const h = block.rows * this.grid.cellSize;

        this.focusRect = this.scene.add.graphics();
        this.focusRect.lineStyle(2, 0x00ff00, 0.8);
        this.focusRect.strokeRect(x, y, w, h);
        this.grid.add(this.focusRect);

        this.scene.tweens.add({
            targets: this.focusRect,
            alpha: { from: 0.4, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    onRowClick(row) {
        if (this.isComplete) return;
        const block = this.blocks[this.currentBlockIndex];
        
        let startRow = 0;
        let endRow = this.data.rows - 1;
        let startCol = 0;
        let endCol = this.data.cols - 1;

        if (this.data.split === 'columns') {
            startCol = (this.currentBlockIndex === 0) ? 0 : this.data.blocks[0].columns;
            endCol = startCol + block.columns - 1;
        } else if (this.data.split === 'rows') {
            startRow = (this.currentBlockIndex === 0) ? 0 : this.data.blocks[0].rows;
            endRow = startRow + block.rows - 1;
        }

        if (block.interaction === 'horizontal' || block.interaction === 'both') {
            if (row >= startRow && row <= endRow) {
                this.grid.activateRowRange(row, startCol, endCol);
                this.scene.playTutorSound('tutor-step');
            } else {
                this.triggerErrorFeedback();
            }
        } else {
            this.triggerErrorFeedback();
        }
    }

    onColumnClick(col) {
        if (this.isComplete) return;
        const block = this.blocks[this.currentBlockIndex];

        let startRow = 0;
        let endRow = this.data.rows - 1;
        let startCol = 0;
        let endCol = this.data.cols - 1;

        if (this.data.split === 'columns') {
            startCol = (this.currentBlockIndex === 0) ? 0 : this.data.blocks[0].columns;
            endCol = startCol + block.columns - 1;
        } else if (this.data.split === 'rows') {
            startRow = (this.currentBlockIndex === 0) ? 0 : this.data.blocks[0].rows;
            endRow = startRow + block.rows - 1;
        }

        if (block.interaction === 'vertical' || block.interaction === 'both') {
            if (col >= startCol && col <= endCol) {
                this.grid.activateColumnRange(col, startRow, endRow);
                this.scene.playTutorSound('tutor-step');
            } else {
                this.triggerErrorFeedback();
            }
        } else {
            this.triggerErrorFeedback();
        }
    }

    triggerErrorFeedback() {
        this.scene.playTutorSound('tutor-error');
        const originalX = 120;
        this.scene.tweens.add({
            targets: this.grid,
            x: originalX + 5,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => { this.grid.x = originalX; }
        });
    }

    update() {
        if (this.isComplete) return;

        const block = this.blocks[this.currentBlockIndex];
        let startRow = 0;
        let startCol = 0;

        if (this.data.split === 'columns') {
            startCol = (this.currentBlockIndex === 0) ? 0 : this.data.blocks[0].columns;
        } else if (this.data.split === 'rows') {
            startRow = (this.currentBlockIndex === 0) ? 0 : this.data.blocks[0].rows;
        }

        let complete = true;
        for (let r = startRow; r < startRow + block.rows; r++) {
            for (let c = startCol; c < startCol + block.columns; c++) {
                if (!this.grid.cells[r][c].active) {
                    complete = false;
                    break;
                }
            }
            if (!complete) break;
        }

        if (complete) {
            this.onBlockComplete();
        }
    }

    onBlockComplete() {
        if (this.currentBlockIndex < this.blocks.length - 1) {
            this.currentBlockIndex++;
            this.highlightCurrentBlock();
        } else {
            this.isComplete = true;
            this.onAllComplete();
        }
    }

    onAllComplete() {
        if (this.focusRect) this.focusRect.destroy();
        this.scene.tweens.add({
            targets: this.grid,
            scale: { from: 1, to: 1.05 },
            duration: 200,
            yoyo: true
        });
    }

    destroy() {
        if (this.focusRect) this.focusRect.destroy();
    }
}
