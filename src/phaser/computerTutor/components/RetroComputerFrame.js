export default class RetroComputerFrame extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height) {
        super(scene, x, y);
        this.frameWidth = width;
        this.frameHeight = height;

        this.createFrame();
        scene.add.existing(this);
    }

    createFrame() {
        const graphics = this.scene.add.graphics();
        
        // Sombra exterior
        graphics.fillStyle(0x000000, 0.5);
        graphics.fillRoundedRect(-5, -5, this.frameWidth + 10, this.frameHeight + 10, 15);

        // Marco metalico base
        graphics.fillStyle(0x333333, 1);
        graphics.fillRoundedRect(0, 0, this.frameWidth, this.frameHeight, 15);
        
        // Borde metalico claro
        graphics.lineStyle(4, 0x666666, 1);
        graphics.strokeRoundedRect(0, 0, this.frameWidth, this.frameHeight, 15);

        // Brillo neon interior
        graphics.lineStyle(2, 0x00ff00, 0.3);
        graphics.strokeRoundedRect(10, 10, this.frameWidth - 20, this.frameHeight - 20, 10);

        // Tornillos en las esquinas
        this.drawScrew(graphics, 15, 15);
        this.drawScrew(graphics, this.frameWidth - 15, 15);
        this.drawScrew(graphics, 15, this.frameHeight - 15);
        this.drawScrew(graphics, this.frameWidth - 15, this.frameHeight - 15);

        this.add(graphics);

        // Etiqueta de la consola
        const label = this.scene.add.text(this.frameWidth / 2, 5, ' MG-88 RETRO COMPUTER ', {
            font: '12px monospace',
            fill: '#00ff00',
            backgroundColor: '#111111'
        }).setOrigin(0.5, 0);
        this.add(label);
    }

    drawScrew(graphics, x, y) {
        graphics.fillStyle(0x222222, 1);
        graphics.fillCircle(x, y, 5);
        graphics.lineStyle(1, 0x555555, 1);
        graphics.strokeCircle(x, y, 5);
        graphics.lineStyle(1, 0x111111, 1);
        graphics.lineBetween(x - 3, y - 3, x + 3, y + 3);
    }
}
