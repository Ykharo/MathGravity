export default class ComputerTutorBoot extends Phaser.Scene {
    constructor() {
        super('ComputerTutorBoot');
    }

    preload() {
        console.log('ComputerTutorBoot: Preloading assets...');
        
        // Texto de carga retro
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.add.text(width / 2, height / 2, 'BOOTING SYSTEM...', {
            font: '24px monospace',
            fill: '#0f0'
        }).setOrigin(0.5);

        // Debug loader
        this.load.on('loaderror', (file) => {
            console.error('ComputerTutorBoot: Error cargando:', file.key, file.src);
        });

        // Audio assets (Usando placeholders del proyecto)
        this.load.path = '../../assets/audio/';
        this.load.audio('tutor-step', 'laser.mp3');
        this.load.audio('tutor-success', 'success.mp3');
        this.load.audio('tutor-error', 'explosion_f.mp3');
    }

    create() {
        console.log('ComputerTutorBoot: Boot complete.');
        this.scene.start('ComputerTutorScene');
    }
}
