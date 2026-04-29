import ComputerTutorBoot from '../../src/phaser/computerTutor/ComputerTutorBoot.js';
import ComputerTutorScene from '../../src/phaser/computerTutor/ComputerTutorScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'lab-container',
    width: 1024,
    height: 768,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#000000',
    scene: [ComputerTutorBoot, ComputerTutorScene]
};

const game = new Phaser.Game(config);

// Exportar para depuración en consola si es necesario
window.labGame = game;
