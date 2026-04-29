export default class RetroGrid extends Phaser.GameObjects.Container {
    constructor(scene, x, y, rows, cols, cellSize = 30) {
        super(scene, x, y);
        this.rows = rows;
        this.cols = cols;
        this.cellSize = cellSize;
        
        this.cells = []; 
        this.activeColor = 0x00ff00;
        this.activeHatched = false;
        this.autoActivate = true; // Controlar si la grilla se activa sola al hacer clic

        this.initGrid();
        scene.add.existing(this);
    }

    initGrid() {
        for (let r = 0; r < this.rows; r++) {
            this.cells[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const x = c * this.cellSize;
                const y = r * this.cellSize;

                // 1. Borde de la celda
                const border = this.scene.add.rectangle(x, y, this.cellSize, this.cellSize)
                    .setOrigin(0)
                    .setStrokeStyle(1, 0x00ff00, 0.2);
                
                // 2. Fondo/Relleno de la celda
                const fill = this.scene.add.rectangle(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4, 0x00ff00, 0)
                    .setOrigin(0);

                // 3. Patron de achurado (opcional)
                const hatch = this.scene.add.graphics({ x, y });
                
                this.add([border, fill, hatch]);

                this.cells[r][c] = {
                    active: false,
                    removed: false,
                    fill: fill,
                    hatch: hatch,
                    border: border
                };
            }
        }

        this.createHitAreas();
    }

    createHitAreas() {
        // Columnas
        for (let c = 0; c < this.cols; c++) {
            // Area tactil mas grande (50px de alto para facilitar el toque)
            const hit = this.scene.add.rectangle(c * this.cellSize + this.cellSize/2, -25, this.cellSize, 50, 0x00ff00, 0.1)
                .setInteractive({ useHandCursor: true });
            this.add(hit);
            
            // Texto de guia "V"
            const guide = this.scene.add.text(c * this.cellSize + this.cellSize/2, -30, 'V', { font: '10px monospace', fill: '#00ff00' }).setOrigin(0.5);
            this.add(guide);

            hit.on('pointerdown', () => {
                this.emit('columnClick', c);
                if (this.autoActivate) this.activateColumn(c);
            });
        }

        // Filas
        for (let r = 0; r < this.rows; r++) {
            // Area tactil mas grande (50px de ancho)
            const hit = this.scene.add.rectangle(-25, r * this.cellSize + this.cellSize/2, 50, this.cellSize, 0x00ff00, 0.1)
                .setInteractive({ useHandCursor: true });
            this.add(hit);

            // Texto de guia ">"
            const guide = this.scene.add.text(-30, r * this.cellSize + this.cellSize/2, '>', { font: '10px monospace', fill: '#00ff00' }).setOrigin(0.5);
            this.add(guide);

            hit.on('pointerdown', () => {
                this.emit('rowClick', r);
                if (this.autoActivate) this.activateRow(r);
            });
        }
    }

    activateColumn(col, color = null, hatched = null) {
        this.activateColumnRange(col, 0, this.rows - 1, color, hatched);
    }

    activateColumnRange(col, startRow, endRow, color = null, hatched = null) {
        const useColor = color || this.activeColor;
        const useHatch = (hatched !== null) ? hatched : this.activeHatched;

        for (let r = startRow; r <= endRow; r++) {
            this.updateCell(r, col, true, useColor, useHatch);
        }
        this.emit('cellUpdate');
    }

    activateRow(row, color = null, hatched = null) {
        this.activateRowRange(row, 0, this.cols - 1, color, hatched);
    }

    activateRowRange(row, startCol, endCol, color = null, hatched = null) {
        const useColor = color || this.activeColor;
        const useHatch = (hatched !== null) ? hatched : this.activeHatched;

        for (let c = startCol; c <= endCol; c++) {
            this.updateCell(row, c, true, useColor, useHatch);
        }
        this.emit('cellUpdate');
    }

    updateCell(r, c, active, color, hatched) {
        const cell = this.cells[r][c];
        if (cell.removed) return; // No tocar si esta borrado

        cell.active = active;
        if (active) {
            if (hatched) {
                cell.fill.setFillStyle(color, 0);
                this.drawHatch(cell.hatch, color);
            } else {
                cell.fill.setFillStyle(color, 0.8);
                cell.hatch.clear();
            }
        } else {
            cell.fill.setFillStyle(color, 0);
            cell.hatch.clear();
        }
    }

    drawHatch(graphics, color) {
        graphics.clear();
        graphics.lineStyle(1, color, 0.8);
        for (let i = 4; i < this.cellSize; i += 8) {
            graphics.lineBetween(i, 2, 2, i);
            graphics.lineBetween(this.cellSize - 2, i, i, this.cellSize - 2);
        }
    }

    removeRow(row) {
        for (let c = 0; c < this.cols; c++) {
            const cell = this.cells[row][c];
            cell.active = false;
            cell.removed = true;
            cell.fill.setFillStyle(0x000000, 0);
            cell.hatch.clear();
            // Mantener el borde original para que se vea la grilla
            cell.border.setStrokeStyle(1, 0x00ff00, 0.2); 
        }
        this.emit('cellUpdate');
    }

    setStyles(color, hatched = false) {
        this.activeColor = color;
        this.activeHatched = hatched;
    }

    getTotalActive() {
        let count = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.cells[r][c].active && !this.cells[r][c].removed) count++;
            }
        }
        return count;
    }
}
