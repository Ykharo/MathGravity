/**
 * Componente que muestra el progreso detallado de cada bloque a la derecha de la grilla.
 */
export default class SideProgressPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        
        this.items = [];
        this.createBase();
        scene.add.existing(this);
    }

    createBase() {
        const title = this.scene.add.text(0, 0, 'SISTEMA DE CONTEO:', {
            font: '14px monospace',
            fill: '#00ff00',
            alpha: 0.7
        });
        this.add(title);
    }

    /**
     * Configura los items de progreso segun los bloques calculados.
     * @param {Array} blocks 
     */
    setupBlocks(blocks) {
        // Limpiar anteriores
        this.items.forEach(item => item.container.destroy());
        this.items = [];

        blocks.forEach((block, index) => {
            const container = this.scene.add.container(0, 40 + (index * 80));
            
            // Icono del bloque
            const iconSize = 25;
            const border = this.scene.add.rectangle(0, 0, iconSize, iconSize)
                .setOrigin(0)
                .setStrokeStyle(1, 0x00ff00, 0.5);
            
            const fill = this.scene.add.rectangle(2, 2, iconSize - 4, iconSize - 4, 0x00ff00, 0.8)
                .setOrigin(0)
                .setVisible(block.interaction === 'horizontal' || blocks.length === 1); // Solido para horizontal o bloques unicos

            const hatch = this.scene.add.graphics({ x: 0, y: 0 });
            if (block.interaction === 'vertical') {
                this.drawHatch(hatch, iconSize, 0x00ff00);
            }

            // Texto de progreso
            const text = this.scene.add.text(iconSize + 15, iconSize / 2, 'ESPERANDO...', {
                font: '18px monospace',
                fill: '#00ff00',
                alpha: 0.5
            }).setOrigin(0, 0.5);

            container.add([border, fill, hatch, text]);
            this.add(container);

            this.items.push({
                container,
                text,
                fill,
                hatch,
                blockData: block
            });
        });
    }

    /**
     * Actualiza el progreso de un bloque especifico.
     * @param {number} index 
     * @param {number} count 
     */
    updateProgress(index, count, total) {
        const item = this.items[index];
        if (!item) return;

        let text = '';
        if (item.blockData.label && count === total) {
            // Si hay un label especial y terminamos, lo usamos
            text = `${item.blockData.label} = ${count}`;
        } else {
            // Cálculo dinámico basado en la interacción
            const rows = item.blockData.rows;
            const cols = item.blockData.columns;
            
            if (item.blockData.interaction === 'vertical') {
                // Se llenan COLUMNAS (vertical) -> El factor vertical (rows) es fijo
                const dynamicCols = Math.round(count / rows);
                text = `${rows} x ${dynamicCols} = ${count}`;
            } else {
                // Se llenan FILAS (horizontal) o ambos -> El factor horizontal (cols) es fijo
                const dynamicRows = Math.round(count / cols);
                text = `${dynamicRows} x ${cols} = ${count}`;
            }
        }
        
        item.text.setText(text);
        item.text.setAlpha(1);
        item.text.setFill(count === total ? '#ffff00' : '#00ff00');

        // Feedback visual
        this.scene.tweens.add({
            targets: item.text,
            scale: { from: 1.2, to: 1 },
            duration: 150
        });
    }

    drawHatch(graphics, size, color) {
        graphics.clear();
        graphics.lineStyle(1, color, 0.8);
        for (let i = 4; i < size; i += 6) {
            graphics.lineBetween(i, 2, 2, i);
            graphics.lineBetween(size - 2, i, i, size - 2);
        }
    }
}
