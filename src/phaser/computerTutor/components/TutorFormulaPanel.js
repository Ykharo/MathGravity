export default class TutorFormulaPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height) {
        super(scene, x, y);
        this.panelWidth = width;
        this.panelHeight = height;
        this.originalX = x;

        this.createPanel();
        scene.add.existing(this);
    }

    createPanel() {
        const graphics = this.scene.add.graphics();
        
        // Fondo panel con efecto cristal
        graphics.fillStyle(0x002200, 0.4);
        graphics.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, 5);
        graphics.lineStyle(1, 0x00ff00, 0.2);
        graphics.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, 5);

        this.add(graphics);

        // Texto descriptivo
        this.add(this.scene.add.text(10, 5, 'ANÁLISIS:', {
            font: '14px monospace',
            fill: '#00ff00',
            alpha: 0.7
        }));

        // Formula (Placeholder dinámico)
        this.formulaText = this.scene.add.text(this.panelWidth / 2, this.panelHeight / 2, '(8 x 5) + (8 x 2) = 56', {
            font: '20px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);
        this.add(this.formulaText);
    }

    setFormula(text) {
        this.formulaText.setText(text);
        this.formulaText.setFill('#00ff00');
        
        // Efecto de parpadeo al cambiar
        this.scene.tweens.add({
            targets: this.formulaText,
            alpha: { from: 0, to: 1 },
            duration: 200,
            repeat: 1
        });
    }

    setError(text) {
        this.formulaText.setText(text);
        this.formulaText.setFill('#ff0000');
        
        // Efecto de sacudida (Shake)
        this.scene.tweens.add({
            targets: this,
            x: this.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                this.x = this.originalX || this.x;
            }
        });
    }
}
