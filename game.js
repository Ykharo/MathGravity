/**
 * MATH GRAVITY - PROFESSIONAL ARCADE EDITION
 * 
 * ARQUITECTURA DEL SISTEMA:
 * 1. Modo Pro vs Clásico: Controlado por window.USE_PRO_ASSETS. Sincronizado en startGameMode().
 * 2. Sistema de Audio Híbrido:
 *    - playTone: Genera sonidos sintéticos para el modo Geométrico.
 *    - Sound Manager: Reproduce archivos .mp3 (laser, explosion, music) para el modo Profesional.
 *    - Desbloqueo: Requiere interacción de usuario (menú HTML o pointerdown) para activar el AudioContext en Safari/Chrome Mac.
 * 3. Escalas Globales:
 *    - Jugador: 0.09 | Enemigos: 0.11-0.12 | Balas: 0.07 | Misiles: 0.1
 * 4. Efectos Visuales Pro:
 *    - Fondo: Negro con estrellas parallax.
 *    - Singularidad: Estrellas púrpura neón y cámara lenta (Time Warp).
 */

// --- CONFIGURACIÓN DE ASSETS ---
// Se controla dinámicamente desde el Menú Inicial en index.html
var USE_PRO_ASSETS = window.USE_PRO_ASSETS || false; 
// -------------------------------

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth, // Permitir ancho completo para modo apaisado en iPad
    height: window.innerHeight,
    backgroundColor: window.USE_PRO_ASSETS ? '#000000' : '#F57C00', // Negro espacial o Naranja Clásico
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 } // No hay gravedad, es visualización top-down
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let targetCoin;
let enemiesGroup;
let particles;
let score = 0;
let scoreTextUI;
let isGameOver = false;
let ringGroup;
let ringObstacles;
let mathBlocksGroup;
let mathTextsGroup;
let answersGroup;
let activeProblem = null;
let failedMath = []; // Listado de objetos { a, b, errors }
let speechRecognition = null;
let isListeningMathAnswer = false;
let mathVoiceHoldTimer = null;
let lightTravelActive = false;
let playerInputFrozen = false;
let releaseFreezeWhenPointerNear = false;
let arrivalSonarRings = [];

// Nuevas variables Survival 
let playerHealth = 100;
let healthBarGraphics; // Gráfico premium de vida
let healthBarText; 
let hasShield = false;
let shieldTimer = 0;
let shieldGraphics = null;
let shieldText = null;
let shieldSprite = null;

// Progreso de Juego
let gameLevel = 1; 

// Singularidad Temporal
let singularityCharges = 0;
let singularityActive = false;
let singularityTimer = 0;
let timeDilation = 1.0;
let isGamePaused = false;

// Estados matemáticos
let currentPhase = "WAITING_BLOCK"; // "WAITING_BLOCK" o "WAITING_ANSWER"

// Modos de Juego y Progreso
let currentGameMode = 0; // 0=Menu, 1=Secuencial, 2=Aleatorio Tabla, 3=Survival

// --- Armas y Combate (Modo 3) ---
let currentCannonAmmo = 0;
let currentMissileAmmo = 0;
let lastFireTime = 0;
let isRadarLocked = false;
let playerShieldCharges = 0;
let enemyBulletsGroup;
let enemyRadarGraphics = null;

// Ancho dinámico del juego
let currentGameWidth = window.innerWidth;

// --- AUDIO SYSTEM (Oscillators & TTS) ---
function playTone(freq, type, duration, volume) {
    if (!window.gameScene || !window.gameScene.sound.context) return;
    try {
        let ctx = window.gameScene.sound.context;
        let osc = ctx.createOscillator();
        let gain = ctx.createGain();
        let volBase = window.GLOBAL_VOLUME !== undefined ? window.GLOBAL_VOLUME : 0.5;
        let finalVol = (volume || 0.1) * volBase;
        
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq || 440, ctx.currentTime);
        gain.gain.setValueAtTime(finalVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (duration || 0.1));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (duration || 0.1));
    } catch (e) {
        console.error("Error en playTone:", e);
    }
}

function playExplosion() {
    if (window.gameScene && USE_PRO_ASSETS) {
        try {
            window.gameScene.sound.play('sfx_explosion', { volume: 0.5 });
            return;
        } catch (e) { console.warn("Fallo sfx_explosion", e); }
    }
    playTone(150, 'sawtooth', 0.2);
}

function playSuccess() {
    if (window.gameScene && USE_PRO_ASSETS) {
        try {
            window.gameScene.sound.play('sfx_success', { volume: 0.5 });
            return;
        } catch (e) { console.warn("Fallo sfx_success", e); }
    }
    playTone(880, 'sine', 0.1);
}

function playLevelUp() {
    if (window.gameScene && USE_PRO_ASSETS) {
        window.gameScene.sound.play('sfx_levelup', { volume: 0.6 });
        return;
    }
    playTone(523, 'square', 0.3);
}

function playLaser() {
    if (window.gameScene && USE_PRO_ASSETS) {
        try {
            window.gameScene.sound.play('sfx_laser', { volume: 0.2 });
            return;
        } catch (e) { console.warn("Fallo sfx_laser", e); }
    }
    playTone(600, 'sine', 0.05);
}

function playMissileLaunch() {
    if (window.gameScene && USE_PRO_ASSETS) {
        try {
            window.gameScene.sound.play('sfx_missile', { volume: 0.4 });
            return;
        } catch (e) { console.warn("Fallo sfx_missile", e); }
    }
    playTone(200, 'sawtooth', 0.2);
}

function playShieldSound() {
    if (window.gameScene && USE_PRO_ASSETS) {
        try {
            window.gameScene.sound.play('sfx_shield', { volume: 0.5 });
            return;
        } catch (e) { console.warn("Fallo sfx_shield", e); }
    }
    playTone(400, 'sine', 0.3);
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Prevenir bug de encolamiento infinito en Safari iOS
        window.speechSynthesis.cancel();
        
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES'; // Más universal en Apple que es-LA
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    }
}

function playHangupSound() {
    playTone(330, 'sawtooth', 0.9, 0.22);
    setTimeout(() => playTone(220, 'sawtooth', 0.7, 0.18), 260);
}

function showMathVoiceMessage(scene, text, color = '#FFFFFF', x = config.width / 2, y = config.height / 2) {
    let msg = scene.add.text(x, y, text, {
        fontSize: '34px',
        fill: color,
        align: 'center',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 6,
        fontFamily: 'Arial, sans-serif'
    });
    msg.setOrigin(0.5);
    msg.setDepth(4000);
    scene.tweens.add({
        targets: msg,
        scale: 1.25,
        alpha: 0,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => msg.destroy()
    });
}

function showTechnicalSpeechError(scene) {
    showMathVoiceMessage(scene, "Problema tecnico\nintente mas tarde...", '#FFCC00');
    speakText("Problema técnico, intente más tarde");
    playHangupSound();
}

function showIncorrectVoiceAnswer(scene) {
    const block = activeProblem && activeProblem.blockRef ? activeProblem.blockRef : null;
    const x = block ? block.x : config.width / 2;
    const y = block ? block.y + 58 : config.height / 2;
    showMathVoiceMessage(scene, "Incorrecto", '#FF3333', x, y);
    speakText("Incorrecto");
    playExplosion();
}

function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function stopMathVoiceListening() {
    if (mathVoiceHoldTimer) {
        clearTimeout(mathVoiceHoldTimer);
        mathVoiceHoldTimer = null;
    }
    isListeningMathAnswer = false;
    if (activeProblem && activeProblem.blockRef && activeProblem.blockRef.micIcon) {
        activeProblem.blockRef.micIcon.setText('MIC');
        activeProblem.blockRef.micIcon.setColor('#FFFFFF');
    }
}

function findCorrectAnswerCoin() {
    if (!answersGroup) return null;
    return answersGroup.getChildren().find(coin => coin.active && coin.isCorrect) || null;
}

function clearArrivalSonar(scene) {
    arrivalSonarRings.forEach(ring => {
        if (ring && ring.active) {
            scene.tweens.killTweensOf(ring);
            ring.destroy();
        }
    });
    arrivalSonarRings = [];
}

function createArrivalSonar(scene, x, y) {
    clearArrivalSonar(scene);
    const colors = [0x00FFFF, 0xFFFFFF, 0xFF00FF];

    for (let i = 0; i < 3; i++) {
        let sonar = scene.add.circle(x, y, 28 + (i * 24));
        sonar.setDepth(3600);
        sonar.setStrokeStyle(5, colors[i], 0.85);
        sonar.setAlpha(0.25 + (i * 0.2));
        arrivalSonarRings.push(sonar);

        scene.tweens.add({
            targets: sonar,
            radius: 92 + (i * 34),
            alpha: 0.12,
            duration: 760 + (i * 160),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => sonar.setPosition(player.x, player.y)
        });
    }
}

function startMathVoiceListening(scene, block) {
    if (currentGameMode !== 3) return;
    if (isGameOver || currentPhase !== "WAITING_ANSWER" || !activeProblem || activeProblem.blockRef !== block) return;
    if (isListeningMathAnswer || lightTravelActive) return;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition || !window.MathSpeech) {
        showTechnicalSpeechError(scene);
        return;
    }

    isListeningMathAnswer = true;
    if (block.micIcon) {
        block.micIcon.setText('REC');
        block.micIcon.setColor('#00FFFF');
    }

    try {
        speechRecognition = new Recognition();
        speechRecognition.lang = 'es-ES';
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.maxAlternatives = 3;

        speechRecognition.onresult = (event) => {
            const alternatives = Array.from(event.results[0] || []);
            const heardCorrectAnswer = alternatives.some(alt => {
                return window.MathSpeech.isSpokenAnswerCorrect(alt.transcript, activeProblem.result);
            });

            stopMathVoiceListening();
            if (heardCorrectAnswer) {
                startLightSpeedTravel(scene);
            } else {
                showIncorrectVoiceAnswer(scene);
            }
        };

        speechRecognition.onerror = () => {
            stopMathVoiceListening();
            showTechnicalSpeechError(scene);
        };

        speechRecognition.onend = () => {
            stopMathVoiceListening();
        };

        speechRecognition.start();
    } catch (e) {
        stopMathVoiceListening();
        showTechnicalSpeechError(scene);
    }
}

function startLightSpeedTravel(scene) {
    if (currentGameMode !== 3) return;
    const correctCoin = findCorrectAnswerCoin();
    if (!correctCoin || !player || lightTravelActive) return;

    lightTravelActive = true;
    playerInputFrozen = true;
    releaseFreezeWhenPointerNear = false;

    const fromX = activeProblem.blockRef ? activeProblem.blockRef.x : player.x;
    const fromY = activeProblem.blockRef ? activeProblem.blockRef.y : player.y;
    const beam = scene.add.graphics();
    beam.setDepth(3500);
    beam.lineStyle(42, 0x00A2FF, 0.20);
    beam.beginPath();
    beam.moveTo(fromX, fromY);
    beam.lineTo(correctCoin.x, correctCoin.y);
    beam.strokePath();
    beam.lineStyle(28, 0x00FFFF, 0.55);
    beam.beginPath();
    beam.moveTo(fromX, fromY);
    beam.lineTo(correctCoin.x, correctCoin.y);
    beam.strokePath();
    beam.lineStyle(10, 0xFFFFFF, 0.95);
    beam.beginPath();
    beam.moveTo(fromX, fromY);
    beam.lineTo(correctCoin.x, correctCoin.y);
    beam.strokePath();
    beam.lineStyle(4, 0xFF00FF, 0.9);
    beam.beginPath();
    beam.moveTo(fromX, fromY);
    beam.lineTo(correctCoin.x, correctCoin.y);
    beam.strokePath();

    const glow = scene.add.circle(player.x, player.y, 14, 0x00FFFF, 0.8);
    glow.setDepth(3501);
    playTone(920, 'sawtooth', 0.22, 0.2);

    player.body.setVelocity(0, 0);
    player.body.setAcceleration(0, 0);
    player.body.enable = false;

    scene.tweens.add({
        targets: player,
        x: correctCoin.x,
        y: correctCoin.y,
        duration: 260,
        ease: 'Expo.easeIn',
        onUpdate: () => {
            glow.setPosition(player.x, player.y);
        },
        onComplete: () => {
            scene.tweens.add({
                targets: [beam, glow],
                alpha: 0,
                duration: 180,
                onComplete: () => {
                    beam.destroy();
                    glow.destroy();
                }
            });

            player.body.enable = true;
            player.body.reset(correctCoin.x, correctCoin.y);
            player.body.setVelocity(0, 0);
            player.body.setAcceleration(0, 0);
            lightTravelActive = false;
            releaseFreezeWhenPointerNear = true;
            createArrivalSonar(scene, correctCoin.x, correctCoin.y);

            if (correctCoin.active) {
                hitAnswerCoin.call(scene, player, correctCoin);
            }
        }
    });
}
// ----------------------------------------
let currentTableIndex = 0;
let currentStep = 1;
let pendingTableSteps = [];

// Rastro y movimiento
let targetX = 0;
let targetY = 0;
let trailEmitter;

let globalRingRotation = 0;
let gapGrowths = [0, 0, 0, 0];

function preload() {
    // Siempre intentamos cargar archivos reales para que el switch del menú funcione al instante.
    if (true) { 

        // Imágenes (Sugerencia de nombres de archivo)
        this.load.image('player_pro', 'assets/images/player.png');
        this.load.image('enemy_pro', 'assets/images/enemy.png');
        this.load.image('enemy_elite_pro', 'assets/images/enemy_elite.png');
        this.load.image('shield_pro', 'assets/images/shield.png');
        this.load.image('bullet_pro', 'assets/images/bullet.png');
        this.load.image('missile_pro', 'assets/images/missile.png');
        
        // Audio
        this.load.audio('sfx_explosion', 'assets/audio/explosion.mp3');
        this.load.audio('sfx_success', 'assets/audio/success.mp3');
        this.load.audio('sfx_levelup', 'assets/audio/levelup.mp3');
        this.load.audio('sfx_laser', 'assets/audio/laser.mp3');
        this.load.audio('sfx_missile', 'assets/audio/missile_launch.mp3');
        this.load.audio('sfx_shield', 'assets/audio/shield.mp3');
        this.load.audio('music_main', 'assets/audio/background_music.mp3');
        
        this.load.on('loaderror', (file) => {
            console.error('Error cargando asset:', file.src);
        });
    }
}

function create() {
    // Exponer función de reposicionamiento
    this.repositionUI = () => {
        actualizarBarraVidaGrafica(this);
        if (mathBlocksGroup) {
            mathBlocksGroup.getChildren().forEach(block => {
                let i = block.mathData.index;
                let blockWidth = 120;
                let gap = 20;
                let totalWidth = (4 * blockWidth) + (3 * gap);
                let startX = (config.width - totalWidth) / 2;
                let x = startX + (i * (blockWidth + gap)) + (blockWidth / 2);
                let yBase = 140;
                let newY = yBase + (window.GLOBAL_TOP_OFFSET || 0);
                block.setY(newY);
                if (block.linkedText) block.linkedText.setY(newY);
                if (block.micIcon) block.micIcon.setY(newY);
                
                // Re-aplicar el tween para que no se desfase
                this.tweens.killTweensOf([block, block.linkedText, block.micIcon]);
                this.tweens.add({
                    targets: [block, block.linkedText, block.micIcon].filter(Boolean),
                    y: newY - 5,
                    duration: Phaser.Math.Between(1500, 2000),
                    yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            });
        }
    };

    window.gameScene = this; // Exponer la capa de escena actual a la interfaz HTML
    
    // Sincronizar Modo con el Menú
    this.cameras.main.setBackgroundColor(USE_PRO_ASSETS ? '#000000' : '#F57C00');

    // Sincronizar Volumen Global
    this.sound.volume = window.GLOBAL_VOLUME !== undefined ? window.GLOBAL_VOLUME : 0.5;

    // Música de Fondo (Solo si Pro Assets está activo)
    if (USE_PRO_ASSETS && this.sound.get('music_main')) {
        this.sound.play('music_main', { loop: true, volume: 0.4 });
    }
    
    // Funciones Habilidad/UI
    this.togglePause = () => {
        isGamePaused = !isGamePaused;
        if (isGamePaused) {
            this.physics.pause();
            this.tweens.pauseAll();
            document.getElementById('btn-pause').innerText = "▶ REANUDAR";
            document.getElementById('btn-pause').style.backgroundColor = "#ff0000";
        } else {
            this.physics.resume();
            this.tweens.resumeAll();
            document.getElementById('btn-pause').innerText = "⏸ PAUSA";
            document.getElementById('btn-pause').style.backgroundColor = "rgba(0,0,0,0.6)";
        }
    };
    
    this.triggerSingularity = () => {
        if (singularityCharges >= 3 && !singularityActive && gameLevel >= 2 && !isGamePaused) {
            singularityCharges -= 3;
            this.updateSingularityUI();
            
            singularityActive = true;
            singularityTimer = 20000;
            timeDilation = 0.05; // Pantano hiper-denso: Velocidad al 5%
            
            // Efecto visual global
            // En Modo Pro usamos un efecto visual de estrellas neón en vez de filtro gris
            if (USE_PRO_ASSETS) {
                if (this.starfield) this.starfield.forEach(s => s.obj.setFillStyle(0xFF00FF)); // Estrellas Púrpuras
                this.cameras.main.shake(200, 0.01);
            } else {
                this.cameras.main.setBackgroundColor('#888888');
            }
            
            let singText = this.add.text(config.width/2, config.height/2, "¡SINGULARIDAD\nCREADA!", { fontSize: '40px', fill: '#FF00FF', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 });
            singText.setOrigin(0.5);
            this.tweens.add({ targets: singText, scale: 1.5, alpha: 0, duration: 2500, ease: 'Power2', onComplete: () => singText.destroy() });
        }
    };
    
    this.updateSingularityUI = () => {
        let btn = document.getElementById('btn-singularity');
        if (!btn) return;
        
        if (gameLevel < 2) {
            btn.style.display = 'none';
            return;
        } else {
            btn.style.display = 'block';
        }
        
        btn.innerText = `NUCLEO TEMPORAL: ${singularityCharges}/3`;
        if (singularityCharges >= 3) {
            btn.style.pointerEvents = "auto";
            btn.style.borderColor = "#f0f";
            btn.style.color = "#fff";
            btn.style.backgroundColor = "#800080";
        } else {
            btn.style.pointerEvents = "none";
            btn.style.borderColor = "#555";
            btn.style.color = "#888";
            btn.style.backgroundColor = "rgba(0,0,0,0.8)";
        }
    };

    this.startGameMode = (mode) => {
        currentGameMode = mode;
        currentTableIndex = 0;
        currentStep = 1;
        pendingTableSteps = [1,2,3,4,5,6,7,8,9,10];
        window.blockTypeMemory = {};
        
        // Sincronización inmediata de Estilo Visual (Pro vs Clásico)
        USE_PRO_ASSETS = window.USE_PRO_ASSETS || false;
        this.cameras.main.setBackgroundColor(USE_PRO_ASSETS ? '#000000' : '#F57C00');

        // Desbloqueo de Audio
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
        this.sound.mute = false;
        this.sound.volume = 1;
        playTone(440, 'sine', 0.5, 0.5); // PITIDO DE PRUEBA (LA 440Hz)

        // Iniciar Música
        if (USE_PRO_ASSETS) {
            this.sound.play('music_main', { loop: true, volume: 0.4 });
        }
        
        // Actualizar textura y escala del jugador según el modo
        let pKey = (USE_PRO_ASSETS && this.textures.exists('player_pro')) ? 'player_pro' : 'playerTex';
        player.setTexture(pKey);
        if (USE_PRO_ASSETS && this.textures.exists('player_pro')) {
            player.setScale(window.GLOBAL_PLAYER_SCALE || 0.1);
            player.body.setCircle(player.width * 0.4, player.width * 0.1, player.height * 0.1);
        } else {
            player.setScale(1.0);
            player.body.setCircle(10, 0, 0);
            player.clearTint();
        }

        // Re-inicializar estrellas si es necesario
        if (this.starfield) this.starfield.forEach(s => s.obj.destroy());
        this.starfield = [];
        if (USE_PRO_ASSETS) {
            for (let i = 0; i < 150; i++) {
                let x = Phaser.Math.Between(0, config.width);
                let y = Phaser.Math.Between(0, config.height);
                let size = Phaser.Math.FloatBetween(0.5, 2.5);
                let star = this.add.circle(x, y, size, 0xFFFFFF, Phaser.Math.FloatBetween(0.3, 1));
                star.setDepth(-10);
                this.starfield.push({ obj: star, speed: size * 0.5 });
            }
        }
        
        score = 0;
        gameLevel = 1;
        playerHealth = 100;
        document.getElementById('score').innerText = score;
        
        player.setPosition(this.cameras.main.centerX, this.cameras.main.centerY + 150);
        player.setVelocity(0,0);
        
        enemiesGroup.clear(true, true);
        answersGroup.getChildren().forEach(c => { if(c.linkedText) c.linkedText.destroy(); });
        answersGroup.clear(true, true);
        mathBlocksGroup.getChildren().forEach(b => {
            if(b.linkedText) b.linkedText.destroy();
            if(b.micIcon) b.micIcon.destroy();
        });
        mathTextsGroup.clear(true, true);
        mathBlocksGroup.clear(true, true);
        
        currentPhase = "WAITING_BLOCK";
        isGamePaused = false;
        isGameOver = false;
        clearArrivalSonar(this);
        playerInputFrozen = false;
        releaseFreezeWhenPointerNear = false;
        
        spawnMathBlocks(this);
    };

    this.returnToMenu = () => {
        currentGameMode = 0;
        clearArrivalSonar(this);
        playerInputFrozen = false;
        releaseFreezeWhenPointerNear = false;
        mathBlocksGroup.getChildren().forEach(b => {
            if(b.linkedText) b.linkedText.destroy();
            if(b.micIcon) b.micIcon.destroy();
        });
        mathBlocksGroup.clear(true, true);
        mathTextsGroup.clear(true, true);
        enemiesGroup.clear(true, true);
        answersGroup.getChildren().forEach(c => { if(c.linkedText) c.linkedText.destroy(); });
        answersGroup.clear(true, true);
        
        // Resetear anillos para la próxima partida
        ringGroup.clear(true, true);
        gapGrowths = [0, 0, 0, 0];
        globalRingRotation = 0;
        dibujarYCrearParedesAnillo(this);
        
        isGamePaused = true;
    };

    // Resetear variables en caso de reinicio
    score = 0;
    isGameOver = false;
    document.getElementById('score').innerText = score;
    targetX = this.cameras.main.centerX;
    targetY = this.cameras.main.centerY;

    // 1. Generar texturas personalizadas con gráficos puros desde memoria
    createCustomTextures(this);

    // Actualizar variable local con el estado global del menú antes de empezar
    USE_PRO_ASSETS = window.USE_PRO_ASSETS || false;

    // 1.5 FONDO ESPACIAL (ESTRELLAS - Solo en Modo Pro)
    this.starfield = [];
    if (USE_PRO_ASSETS) {
        for (let i = 0; i < 150; i++) {
            let x = Phaser.Math.Between(0, config.width);
            let y = Phaser.Math.Between(0, config.height);
            let size = Phaser.Math.FloatBetween(0.5, 2.5);
            let star = this.add.circle(x, y, size, 0xFFFFFF, Phaser.Math.FloatBetween(0.3, 1));
            star.setDepth(-10);
            this.starfield.push({
                obj: star,
                speed: size * 0.5
            });
        }
    }

    // 2. Decoración de Fondo (Anillo punteado central)
    dibujarAnilloCentral(this);

    // 3. Crear al Jugador
    let pKey = (USE_PRO_ASSETS && this.textures.exists('player_pro')) ? 'player_pro' : 'playerTex';
    player = this.physics.add.sprite(this.cameras.main.centerX, this.cameras.main.centerY + 150, pKey);
    
    // AJUSTE DE ESCALA PARA ASSETS PRO
    if (USE_PRO_ASSETS && this.textures.exists('player_pro')) {
        player.setScale(window.GLOBAL_PLAYER_SCALE || 0.1);
        player.body.setCircle(player.width * 0.4, player.width * 0.1, player.height * 0.1); 
    } else {
        player.body.setCircle(10, 0, 0); 
    }
    
    player.setCollideWorldBounds(true);
    player.setDamping(true);
    player.setDrag(window.GLOBAL_DRAG || 0.04); // Fluidez de arrastre, simula inercia
    player.setMaxVelocity(window.GLOBAL_MAX_VEL || 400);
    // Añadimos rebote fuerte (campo de energía) para los muros
    player.body.setBounce(1.5, 1.5);
    
    // Exponer el player al DOM para los sliders
    window.player = player;
    
    // 4. Crear la estela punteada del jugador (Particles)
    trailEmitter = this.add.particles(0, 0, 'trailTex', {
        speed: 0,
        scale: { start: 0.8, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 2500, // Estela mucho más extensa (vive 2.5 segundos)
        blendMode: 'ADD',
        frequency: 80 // Emisión más lenta para separar un poco más los fragmentos
    });
    trailEmitter.startFollow(player);

    // 5. Crear grupo de Enemigos
    enemiesGroup = this.physics.add.group({
        bounceX: 1, // Rebote perfecto
        bounceY: 1,
        collideWorldBounds: true // Que reboten en los bordes
    });
    
    // Contenedor visual de paredes eliminado (usamos perlas renderizadas)

    ringGroup = this.physics.add.group({
        immovable: true,
        allowGravity: false
    });
    dibujarYCrearParedesAnillo(this);

    // 6. Preparar Sistema Educativo
    mathBlocksGroup = this.physics.add.staticGroup();
    mathTextsGroup = this.add.group();
    answersGroup = this.physics.add.group({
        immovable: true // Para que la nave rebote si es falso
    });
    
    // Balas enemigas
    enemyBulletsGroup = this.physics.add.group();
    this.physics.add.overlap(player, enemyBulletsGroup, (p, b) => { b.destroy(); takeDamage(this, 10); }, null, this);
    
    enemyRadarGraphics = this.add.graphics();

    
    // spawnMathBlocks(this); // Ahora se invoca desde startGameMode()

    // 7. Colisiones y Físicas Generales
    this.physics.add.collider(player, enemiesGroup, hitEnemy, null, this);
    
    // Armas (Modo 3)
    let bulletKey = (USE_PRO_ASSETS && this.textures.exists('bullet_pro')) ? 'bullet_pro' : 'bulletTex';
    let missileKey = (USE_PRO_ASSETS && this.textures.exists('missile_pro')) ? 'missile_pro' : 'missileTex';
    
    bulletsGroup = this.physics.add.group({ defaultKey: bulletKey, maxSize: 50 });
    missilesGroup = this.physics.add.group({ defaultKey: missileKey, maxSize: 50 });
    radarGraphics = this.add.graphics();
    radarGraphics.setDepth(5);
    
    this.physics.add.overlap(bulletsGroup, enemiesGroup, hitEnemyWithWeapon, null, this);
    this.physics.add.overlap(missilesGroup, enemiesGroup, hitEnemyWithWeapon, null, this);
    
    // Ignorar por completo la colisión física si el usuario apagó el muro en el Lab
    this.physics.add.collider(player, ringGroup, hitRingWall, () => window.GLOBAL_RING_VISIBLE !== false, this);
    this.physics.add.collider(enemiesGroup, ringGroup, null, () => window.GLOBAL_RING_VISIBLE !== false, this);

    // Colisión de Menú Top (Aceptar misión del bloque con rebote)
    this.physics.add.collider(player, mathBlocksGroup, hitMathBlock, null, this);
    
    // Colisiones con Monedas Creadas (Respuestas)
    // Usamos collider en vez de overlap para poder rebotar en las falsas. Resolvelo en la función logica
    this.physics.add.collider(player, answersGroup, hitAnswerCoin, null, this);
    
    // Si estamos reiniciando la escena y el modo ya está elegido, arrancamos los bloques
    if (currentGameMode !== 0 && !isGameOver) {
        this.time.delayedCall(100, () => {
             spawnMathBlocks(this);
        });
    }
    
    // Inicializar Gráficos de Vida (Premium)
    healthBarGraphics = this.add.graphics().setDepth(2000);
    healthBarText = this.add.text(0, 0, `${playerHealth}%`, { fontSize: '16px', fill: '#FFF', fontStyle: 'bold', align: 'center', fontFamily: 'monospace' });
    healthBarText.setOrigin(0.5);
    healthBarText.setDepth(2001);
    
    // Escudo visual base (Oculto)
    shieldGraphics = this.add.graphics();
    shieldText = this.add.text(0, 0, "", { fontSize: '18px', fill: '#0ff', fontStyle: 'bold' });
    shieldText.setOrigin(0.5);
    
    // Crear el sprite del escudo siempre, para que esté listo si se activa el modo pro
    shieldSprite = this.add.sprite(0, 0, 'shield_pro');
    shieldSprite.setVisible(false).setAlpha(0.4).setDepth(2).setScale(0.6); // Escala base visual

    // 8. Controles (Seguir el ratón / Dedo táctil)
    this.input.on('pointerdown', function (pointer) {
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }
        if (!isGameOver) {
            targetX = pointer.x;
            targetY = pointer.y;
        }
    }, this);
    
    this.input.on('pointermove', function (pointer) {
        if (!isGameOver) {
            targetX = pointer.x;
            targetY = pointer.y;
        }
    }, this);
}

function update() {
    if (isGameOver) return;

    // Control Temporal (Singularidad)
    if (singularityActive && !isGamePaused) {
        singularityTimer -= (1000/60);
        if (singularityTimer <= 0) {
            singularityActive = false;
            timeDilation = 1.0;
            // Restaurar estrellas a blanco
            if (this.starfield) this.starfield.forEach(s => s.obj.setFillStyle(0xFFFFFF));
        }
    }

    // Movimiento del Fondo (Parallax Estrellas)
    if (this.starfield && !isGamePaused) {
        this.starfield.forEach(star => {
            star.obj.y += star.speed * timeDilation;
            if (star.obj.y > config.height) {
                star.obj.y = 0;
                star.obj.x = Phaser.Math.Between(0, config.width);
            }
        });
    }

    // Actualizar rotaciones físicas y visuales al mismo tiempo (perlas visibles circulares)
    let rotAmount = 0.003 * timeDilation;
    globalRingRotation += rotAmount;
    
    // Ajuste dinámico del ancho del juego desde Lab
    if (window.GLOBAL_GAME_WIDTH !== undefined && window.GLOBAL_GAME_WIDTH !== currentGameWidth) {
        currentGameWidth = window.GLOBAL_GAME_WIDTH;
        config.width = currentGameWidth; 
        this.scale.resize(currentGameWidth, config.height);
        this.physics.world.setBounds(0, 0, currentGameWidth, config.height);
    }
    
    // Actualizar Barra de Vida Gráfica
    actualizarBarraVidaGrafica(this);
    
    let currentRadius = config.width * (window.GLOBAL_RING_RADIUS_PCT !== undefined ? window.GLOBAL_RING_RADIUS_PCT : 0.15);
    let centerY = config.height / 2 + (currentRadius * 0.5); // 1/4 más abajo que antes (0.25 -> 0.5)
    Phaser.Actions.RotateAroundDistance(ringGroup.getChildren(), { x: config.width / 2, y: centerY }, rotAmount, currentRadius);
    
    if (window.GLOBAL_RING_VISIBLE !== undefined && ringGroup.visible !== window.GLOBAL_RING_VISIBLE) {
        ringGroup.setVisible(window.GLOBAL_RING_VISIBLE);
        ringGroup.children.iterate(p => p.body.enable = window.GLOBAL_RING_VISIBLE);
    }
    
    if (enemyRadarGraphics) enemyRadarGraphics.clear();

    if (window.centralRingGraphic) {
        window.centralRingGraphic.clear();
        if (window.GLOBAL_RING_VISIBLE !== false) {
            window.centralRingGraphic.lineStyle(2, 0xD84315, 0.4); 
            // Apertura de 2 naves (arco de apertura ampliado)
            let startAngle = globalRingRotation;
            let endAngle = globalRingRotation + (Math.PI * 2) - 0.6; // ~2x ancho nave
            window.centralRingGraphic.beginPath();
            window.centralRingGraphic.arc(config.width/2, centerY, currentRadius, startAngle, endAngle);
            window.centralRingGraphic.strokePath();
        }
    }

    // Configuración Variables Vivo
    let tension = window.GLOBAL_TENSION || 8;
    let engineForce = window.GLOBAL_ENGINE || 0;
    let radioGiroFuerza = window.GLOBAL_RADIO_GIRO || 8.0;
    
    // Aceleración de Auto-Motor (siempre hacia donde apunta la nariz visiblemente, sea estacionario o inercial)
    let anguloVisual = player.rotation - Math.PI / 2; 
    let engX = Math.cos(anguloVisual) * engineForce;
    let engY = Math.sin(anguloVisual) * engineForce;
    
    // --- LÓGICA DE RADAR Y ARMAS (Modo 3) ---
    isRadarLocked = false;
    let nearestEnemyForCannon = null;
    let nearestEnemyDistCannon = window.GLOBAL_RADAR_RADIUS || 300;
    
    // El escudo automático ahora es reactivo en takeDamage (Nivel 10+)
    // Eliminada la activación por proximidad para que sea solo de reacción


    if (currentGameMode === 3) {
        // Escaneo global para misiles
        if (score >= 8 && currentMissileAmmo > 0) {
            enemiesGroup.getChildren().forEach(enemy => {
                if (enemy.active) {
                    let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                    if (dist < (window.GLOBAL_RADAR_RADIUS || 300) * 1.5) {
                        fireMissiles(this, enemy);
                    }
                }
            });
        }

        if (score >= 5 && currentCannonAmmo > 0) {
            enemiesGroup.getChildren().forEach(enemy => {
                if (enemy.active) {
                    let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                    if (dist < nearestEnemyDistCannon) {
                        nearestEnemyDistCannon = dist;
                        nearestEnemyForCannon = enemy;
                    }
                }
            });
            
            radarGraphics.clear();
            if (nearestEnemyForCannon) {
                radarGraphics.lineStyle(1, 0x00FF00, Math.abs(Math.sin(this.time.now / 150)) * 0.5); // Parpadeo más tenue
                radarGraphics.fillStyle(0x00FF00, 0.05); // Más transparente
                
                let radarAngleSpan = Math.PI / 6; // Cono
                radarGraphics.beginPath();
                radarGraphics.moveTo(player.x, player.y);
                radarGraphics.arc(player.x, player.y, window.GLOBAL_RADAR_RADIUS || 300, player.rotation - Math.PI/2 - radarAngleSpan, player.rotation - Math.PI/2 + radarAngleSpan);
                radarGraphics.closePath();
                radarGraphics.fillPath();
                radarGraphics.strokePath();
            }

            // Apuntar y disparar
            if (nearestEnemyForCannon) {
                isRadarLocked = true; // PAUSA EVASIVA Y AERODINAMICA
                let targetAngle = Phaser.Math.Angle.Between(player.x, player.y, nearestEnemyForCannon.x, nearestEnemyForCannon.y);
                let diff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(player.rotation), Phaser.Math.RadToDeg(targetAngle) + 90);
                
                player.rotation += Phaser.Math.DegToRad(diff) * 0.15; // Girar suavemente hacia el enemigo
                
                if (Math.abs(diff) < 10) { // Bloqueado
                    radarGraphics.lineStyle(4, 0xFF0000, 1);
                    radarGraphics.strokeCircle(nearestEnemyForCannon.x, nearestEnemyForCannon.y, 20);
                    fireCannons(this);
                }
            }
        } else {
            if(radarGraphics) radarGraphics.clear();
        }
    }
    
    if (playerInputFrozen) {
        player.body.setAcceleration(0, 0);
        player.body.setVelocity(0, 0);
        if (releaseFreezeWhenPointerNear) {
            let pointer = this.input.activePointer;
            let distPointer = Phaser.Math.Distance.Between(pointer.x, pointer.y, player.x, player.y);
            if (distPointer < 80) {
                playerInputFrozen = false;
                releaseFreezeWhenPointerNear = false;
                clearArrivalSonar(this);
                targetX = pointer.x;
                targetY = pointer.y;
            }
        }
    } else if (window.GLOBAL_AUTOPILOT) {
        // Sonar Visual (Emite un pulso verde circular cada medio segundo)
        if (!this.lastSonarTime || this.time.now > this.lastSonarTime + 500) {
            this.lastSonarTime = this.time.now;
            let sonar = this.add.circle(player.x, player.y, 10);
            sonar.setStrokeStyle(3, 0x00FF00, 0.4); 
            // Ocultar indicador verde en modo Pro
            if (USE_PRO_ASSETS) sonar.setVisible(false);
            
            this.tweens.add({
                targets: sonar,
                radius: 150, // Alcanza exactamente el radio de evasión para que el jugador vea los bordes reales del escáner
                alpha: 0,
                duration: 900, // Se desvanece suavemente mientras viaja
                onComplete: () => sonar.destroy()
            });
        }

        // AUTOPILOTO: Atracción constante hacia el ratón
        let dx = targetX - player.x;
        let dy = targetY - player.y;
        let distTarget = Math.sqrt(dx*dx + dy*dy);
        
        // Empuje base de atraccion
        let aiX = 0, aiY = 0;
        if (distTarget > 15) {
            aiX = (dx / distTarget) * radioGiroFuerza * 100;
            aiY = (dy / distTarget) * radioGiroFuerza * 100;
        }

        // AUTOPILOTO: Escáner Táctico de Enemigos
        let radioEvasion = hasShield ? 300 : 150; // Si tiene escudo el rango visual se duplica para buscar víctimas
        if (typeof enemiesGroup !== 'undefined') {
            enemiesGroup.getChildren().forEach(enemy => {
                if(enemy.active) {
                    let ex = player.x - enemy.x;
                    let ey = player.y - enemy.y;
                    let distEnemigo = Math.sqrt(ex*ex + ey*ey);
                    
                    if (distEnemigo < radioEvasion && distEnemigo > 0) {
                        if (hasShield) {
                            // MODO KAMIKAZE: Se arroja a asesinar al enemigo de forma magnética para aprovechar el escudo
                            let fuerzaCaza = (radioEvasion - distEnemigo) * 15;
                            aiX += -(ex / distEnemigo) * fuerzaCaza; // Negativo para que acerque en vez de evadir
                            aiY += -(ey / distEnemigo) * fuerzaCaza;
                        } else {
                            // MODO EVASIVO: Vector inversamente proporcional: curva dramática de escape
                            let fuerzaEvasion = (radioEvasion - distEnemigo) * 15;
                            aiX += (ex / distEnemigo) * fuerzaEvasion;
                            aiY += (ey / distEnemigo) * fuerzaEvasion;
                        }
                    }
                }
            });
        }
        // MAGNETISMO A MONEDAS DIRIGIDO POR CURSOR: Evita orbitar y choques accidentales
        if (typeof answersGroup !== 'undefined' && currentPhase === "WAITING_ANSWER") {
             answersGroup.getChildren().forEach(coin => {
                 if (coin.active) {
                     // Distancia del PUNTERO a la moneda
                     let dxPointer = coin.x - targetX;
                     let dyPointer = coin.y - targetY;
                     let distPointerToCoin = Math.sqrt(dxPointer*dxPointer + dyPointer*dyPointer);
                     
                     // Si el puntero está exactamente sobre/muy cerca de la moneda
                     if (distPointerToCoin < 40) { 
                         // Fuerza de succión de la nave hacia la moneda
                         let cx = coin.x - player.x;
                         let cy = coin.y - player.y;
                         let cDist = Math.sqrt(cx*cx + cy*cy);
                         if (cDist > 0) {
                             aiX += (cx / cDist) * 5000;
                             aiY += (cy / cDist) * 5000;
                         }
                     }
                 }
             });
        }
        
        player.body.setAcceleration(aiX + engX, aiY + engY);

    } else if (this.input.activePointer.isDown) {
        // Al tocar, calculamos la curvatura en base al diferencial de posiciones para que actúe agresivo según la barra 
        let dx = targetX - player.x;
        let dy = targetY - player.y;
        
        player.body.setAcceleration(
            (dx * radioGiroFuerza) + engX,
            (dy * radioGiroFuerza) + engY
        );
    } else {
        // Libre de tracción de tap; motor de autonomía continua dictando rumbo inercial
        player.body.setAcceleration(engX, engY);
    }

    // MAGIA AERODINÁMICA: La nave apunta SIEMPRE alineada a su trayectoria de velocidad, curvando natural y orgánicamente
    if (!isRadarLocked && player.body.velocity.lengthSq() > 2) { 
        player.rotation = player.body.velocity.angle() + Math.PI / 2;
    }

    // Actualizar visuales del SHIELD si está activo
    if (hasShield) {
        if (USE_PRO_ASSETS && this.textures.exists('shield_pro') && shieldSprite) {
            shieldGraphics.clear();
            shieldSprite.setVisible(true);
            shieldSprite.setPosition(player.x, player.y);
            shieldSprite.setScale((window.GLOBAL_SHIELD_SCALE || 1.2) * 0.5);
            shieldSprite.setAlpha(window.GLOBAL_SHIELD_ALPHA || 0.4);
            shieldSprite.rotation += 0.02 * timeDilation;
        } else {
            shieldGraphics.clear();
            shieldGraphics.lineStyle(3, 0x00FFFF, 1);
            shieldGraphics.beginPath();
            shieldGraphics.arc(player.x, player.y, 25, 0, Math.PI * 2);
            shieldGraphics.strokePath();
        }
        
        shieldText.setPosition(player.x, player.y - 45);
        
        shieldTimer -= (1000/60); // approx delta
        if (shieldTimer <= 0) {
            hasShield = false;
            shieldGraphics.clear();
            if (shieldSprite) shieldSprite.setVisible(false);
            shieldText.setText("");
        } else {
            shieldText.setText((shieldTimer / 1000).toFixed(1) + "s");
        }
    }

    // Lógica Evolutiva de Enemigos
    enemiesGroup.children.iterate(function (enemy) {
        if(enemy && enemy.active) {
            // 1. IA DE DISPARO (Solo naves Rojas/Elite y score >= 6)
            let isElite = enemy.texture && (enemy.texture.key === 'enemyShieldTex' || enemy.texture.key === 'enemy_elite_pro');
            if (isElite && score >= 6) {
                let distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
                let radarRange = 250;
                if (distToPlayer < radarRange) {
                    let forwardAngle = enemy.rotation - Math.PI/2;
                    let angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
                    let diff = Phaser.Math.Angle.Wrap(angleToPlayer - forwardAngle);
                    
                    enemyRadarGraphics.lineStyle(2, 0xff0000, 0.3);
                    enemyRadarGraphics.fillStyle(0xff0000, 0.05);
                    enemyRadarGraphics.beginPath();
                    enemyRadarGraphics.moveTo(enemy.x, enemy.y);
                    enemyRadarGraphics.arc(enemy.x, enemy.y, radarRange, forwardAngle - 0.4, forwardAngle + 0.4);
                    enemyRadarGraphics.closePath();
                    enemyRadarGraphics.fillPath();
                    enemyRadarGraphics.strokePath();
                    
                    let fireRate = window.GLOBAL_ENEMY_FIRE_RATE || 2000;
                    if (!enemy.lastFireTime) enemy.lastFireTime = 0;
                    if (this.time.now > enemy.lastFireTime + fireRate && Math.abs(diff) < 0.4) {
                        enemy.lastFireTime = this.time.now;
                        let numBullets = 1;
                        if (score >= 10) numBullets = 5;
                        else if (score >= 9) numBullets = 4;
                        else if (score >= 8) numBullets = 3;
                        else if (score >= 7) numBullets = 2;
                        
                        for(let n=0; n<numBullets; n++) {
                            let spread = (n - (numBullets-1)/2) * 0.1;
                            let ebKey = (USE_PRO_ASSETS && this.textures.exists('bullet_pro')) ? 'bullet_pro' : 'bulletTex';
                            let eb = enemyBulletsGroup.create(enemy.x, enemy.y, ebKey);
                            if(eb) {
                                if (USE_PRO_ASSETS) {
                                    eb.setScale(0.07); 
                                    eb.rotation = forwardAngle + spread;
                                } else {
                                    eb.setTint(0xff0000);
                                }
                                eb.body.setCircle(4);
                                let speed = window.GLOBAL_ENEMY_BULLET_SPEED || 400;
                                this.physics.velocityFromRotation(forwardAngle + spread, speed, eb.body.velocity);
                                this.time.delayedCall(2000, () => { if(eb.active) eb.destroy(); });
                            }
                        }
                        if (score >= 10) {
                            this.time.delayedCall(200, () => {
                                let emKey = (USE_PRO_ASSETS && this.textures.exists('missile_pro')) ? 'missile_pro' : 'missileTex';
                                let em = enemyBulletsGroup.create(enemy.x, enemy.y, emKey);
                                if(em) { 
                                    if (USE_PRO_ASSETS) em.setScale(0.1);
                                    else em.setTint(0xff00ff); 
                                    this.physics.velocityFromRotation(forwardAngle, 250, em.body.velocity); 
                                    this.time.delayedCall(4000, () => { if(em.active) em.destroy(); }); 
                                }
                            });
                        }
                    }
                }
            }

            // 2. IA DE MOVIMIENTO
            if (currentGameMode === 1 || currentGameMode === 2) {
                enemy.rotation += 0.05;
            } else if (currentGameMode === 3) {
                if (gameLevel === 1) {
                    // Nivel 1: Movimiento Aleatorio Inercial (No persiguen, solo rotan)
                    enemy.rotation += 0.02 * timeDilation;
                    // Mantienen la velocidad de spawn (rebote automático por Arcade Physics)
                } else {
                    // Nivel 2+: Enjambre (Boids)
                    let anguloJugador = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
                    let anguloObjetivo = anguloJugador + Math.PI / 2;
                    let diffRot = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(enemy.rotation), Phaser.Math.RadToDeg(anguloObjetivo));
                    enemy.rotation += Phaser.Math.DegToRad(diffRot) * (timeDilation === 1.0 ? 1.0 : 0.05 * timeDilation);
                    
                    let speed = 45 * timeDilation;
                    let vX = Math.cos(anguloJugador) * speed;
                    let vY = Math.sin(anguloJugador) * speed;
                    
                    enemiesGroup.getChildren().forEach(otro => {
                        if (otro !== enemy && otro.active) {
                            let dx = enemy.x - otro.x; let dy = enemy.y - otro.y; let dist2 = dx*dx + dy*dy;
                            if (dist2 > 0 && dist2 < 2500) { 
                                let distReal = Math.sqrt(dist2);
                                let panico = (50 - distReal) * 2 * timeDilation;
                                vX += (dx / distReal) * panico; vY += (dy / distReal) * panico;
                            }
                        }
                    });
                    enemy.body.setVelocity(vX, vY);
                }
            }
        }
    }, this);

    // Misiles Homing Update
    if (typeof missilesGroup !== 'undefined') {
        missilesGroup.getChildren().forEach(missile => {
            if (missile.active && missile.target && missile.target.active) {
                let mSpeed = window.GLOBAL_MISSILE_SPEED || 400;
                let mTurn = window.GLOBAL_MISSILE_TURN || 0.1;
                
                let angleToTarget = Phaser.Math.Angle.Between(missile.x, missile.y, missile.target.x, missile.target.y);
                
                // Efecto Zig-Zag
                let zigzag = Math.sin((this.time.now - missile.birthTime) * 0.01 + missile.randomOffset) * 0.5; 
                angleToTarget += zigzag;
                
                let diff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(missile.rotation), Phaser.Math.RadToDeg(angleToTarget));
                missile.rotation += Phaser.Math.DegToRad(diff) * mTurn;
                
                missile.body.setVelocity(
                    Math.cos(missile.rotation) * mSpeed,
                    Math.sin(missile.rotation) * mSpeed
                );
            } else if (missile.active) {
                missile.body.setAcceleration(0,0);
            }
        });
    }
}

/** Funciones Lógicas del Juego **/

function spawnSingleMathBlock(scene, i, forcedA = null, forcedB = null) {
    let blockWidth = 120;
    let blockHeight = 50;
    let gap = 20;
    let totalWidth = (4 * blockWidth) + (3 * gap);
    let startX = (config.width - totalWidth) / 2;
    let x = startX + (i * (blockWidth + gap)) + (blockWidth / 2);
    let y = 140 + (window.GLOBAL_TOP_OFFSET || 0); // Bajamos otros 30 para asegurar visibilidad total

    let blockType = "NORMAL";
    let tex = 'blockTex_orange';
    
    let memKey = null;
    if (forcedA !== null && forcedB !== null && (currentGameMode === 1 || currentGameMode === 2)) {
         memKey = `${forcedA}x${forcedB}`;
    }

    if (memKey && window.blockTypeMemory && window.blockTypeMemory[memKey]) {
         blockType = window.blockTypeMemory[memKey];
         tex = (blockType === "HEAL") ? 'blockTex_green' : ((blockType === "SHIELD") ? 'blockTex_cyan' : 'blockTex_orange');
    } else {
         let randType = Math.random();
         if (playerHealth <= 75 && randType < 0.20) {
             blockType = "HEAL";
             tex = 'blockTex_green';
         } else if (randType > 0.85 && randType <= 0.95) { 
             blockType = "SHIELD";
             tex = 'blockTex_cyan';
         }
         
         if (memKey) {
             window.blockTypeMemory = window.blockTypeMemory || {};
             window.blockTypeMemory[memKey] = blockType;
         }
    }

    let block = mathBlocksGroup.create(x, y, tex);
    block.body.setSize(blockWidth, blockHeight);
    
    let factorA, factorB;
    let resolucionInedita = false;
    let fallbackPuroAleatorio = false; // Bandera de rescate numérico
    let abortSafety = 0;
    
    if (forcedA !== null && forcedB !== null) {
        factorA = forcedA;
        factorB = forcedB;
    } else {
        // Algoritmo anti-clonación riguroso
        while (!resolucionInedita) {
            abortSafety++;
            if (abortSafety > 5) fallbackPuroAleatorio = true; // Demasiados rechazos: la lista fallida es un loop tóxico. Fallback a crudos!
            
            if (!fallbackPuroAleatorio && ((failedMath.length > 0 && Math.random() < 0.4) || blockType !== "NORMAL")) {
                 let focusList = failedMath.length > 0 ? failedMath : [ {a:7,b:8}, {a:6,b:9}, {a:8,b:8}, {a:9,b:7} ]; 
                 let rep = Phaser.Utils.Array.GetRandom(focusList);
                 factorA = rep.a;
                 factorB = rep.b;
            } else {
                 // Forzar creación desde cero usando Tablas Válidas
                 factorA = Phaser.Utils.Array.GetRandom(window.GLOBAL_VALID_TABLES);
                 factorB = Phaser.Math.Between(1, 10);
            }
            
            let resultadoPropuesto = factorA * factorB;
            let esDuplicadoEnTablero = false;
            
            if(typeof mathBlocksGroup !== 'undefined' && mathBlocksGroup.getChildren().length > 0) {
                 mathBlocksGroup.getChildren().forEach(b => {
                     if (b && b.mathData && b.mathData.result === resultadoPropuesto) {
                         esDuplicadoEnTablero = true;
                     }
                 });
            }
            
            if (!esDuplicadoEnTablero || abortSafety >= 50) { // Safety escape absoluto para prevenir crasheo web
                resolucionInedita = true;
            }
        }
    }
    
    block.mathData = { a: factorA, b: factorB, result: factorA * factorB, type: blockType, index: i };
    
    let txt = scene.add.text(x, y, `${factorA}x${factorB}`, { fontSize: '30px', fill: '#FFF', align: 'center', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' });
    txt.setOrigin(0.5);
    txt.setRotation(Phaser.Math.FloatBetween(-0.05, 0.05));
    mathTextsGroup.add(txt);
    
    block.linkedText = txt;

    let micIcon = scene.add.text(x + 39, y, 'MIC', { fontSize: '15px', fill: '#FFFFFF', fontStyle: 'bold', fontFamily: 'Arial, sans-serif' });
    micIcon.setOrigin(0.5);
    micIcon.setVisible(false);
    micIcon.setDepth(2500);
    mathTextsGroup.add(micIcon);
    block.micIcon = micIcon;
    block.setInteractive({ useHandCursor: true });
    block.on('pointerdown', () => {
        if (currentGameMode !== 3) return;
        if (currentPhase !== "WAITING_ANSWER" || !activeProblem || activeProblem.blockRef !== block) return;
        startMathVoiceListening(scene, block);
    });
    block.on('pointerup', stopMathVoiceListening);
    block.on('pointerout', stopMathVoiceListening);
    
    scene.tweens.add({
        targets: [block, txt, micIcon],
        y: y - 5,
        duration: Phaser.Math.Between(1500, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

function spawnMathBlocks(scene) {
    if (currentGameMode === 0) return;
    mathBlocksGroup.clear(true, true);
    mathTextsGroup.clear(true, true);
    
    if (currentGameMode === 1) {
        let fA = window.GLOBAL_VALID_TABLES[currentTableIndex];
        let fB = currentStep;
        spawnSingleMathBlock(scene, 1.5, fA, fB);
    } else if (currentGameMode === 2) {
        let fA = window.GLOBAL_VALID_TABLES[currentTableIndex];
        let maxSpawn = Math.min(4, pendingTableSteps.length);
        let shuffledSteps = Phaser.Utils.Array.Shuffle([...pendingTableSteps]);
        let selectedSteps = shuffledSteps.slice(0, maxSpawn);
        for (let i = 0; i < maxSpawn; i++) {
            let posIndex = maxSpawn === 1 ? 1.5 : (maxSpawn === 2 ? 1 + i : (maxSpawn === 3 ? 0.5 + i : i));
            spawnSingleMathBlock(scene, posIndex, fA, selectedSteps[i]);
        }
    } else if (currentGameMode === 3) {
        for (let i = 0; i < 4; i++) {
            spawnSingleMathBlock(scene, i);
        }
    }
}

function hitMathBlock(player, block) {
    if (isGameOver) return;

    // Rebote fisico real (efecto ilusion de fisica requerida)
    let bouncePoint = new Phaser.Math.Vector2(player.x - block.x, player.y - block.y);
    bouncePoint.normalize().scale(800);
    player.body.setVelocity(bouncePoint.x, bouncePoint.y);

    if (currentPhase !== "WAITING_BLOCK") return;
    
    currentPhase = "WAITING_ANSWER";
    activeProblem = block.mathData;
    speakText(`¿Cuánto es ${activeProblem.a} por ${activeProblem.b}?`);
    
    // Tintinar el bloque elegido permanentemente
    block.setTint(0xFFFF00);

    this.tweens.add({
        targets: block,
        alpha: 0.2,
        duration: 100,
        yoyo: true,
        repeat: -1
    });
    
    activeProblem.blockRef = block;
    if (block.linkedText) block.linkedText.setX(block.x - 12);
    if (block.micIcon && currentGameMode === 3) {
        block.micIcon.setVisible(true);
        block.micIcon.setAlpha(1);
        this.tweens.add({
            targets: block.micIcon,
            alpha: 0.25,
            duration: 420,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Apagar visualmente los demás bloques temporales
    mathBlocksGroup.getChildren().forEach(b => { 
        if (b !== block) {
            b.setAlpha(0.2); 
            if(b.linkedText) b.linkedText.setAlpha(0.2);
            if(b.micIcon) b.micIcon.setAlpha(0.2);
        }
    });

    spawnAnswerCoins(this, activeProblem);
}

function hitAnswerCoin(player, coin) {
    if (isGameOver || currentPhase !== "WAITING_ANSWER") return;

    if (coin.isCorrect) {
        // --- RESPUESTA CORRECTA ---
        playSuccess();
        speakText(`¡Correcto!, ${activeProblem.a} por ${activeProblem.b} es ${activeProblem.result}`);
        
        score++;
        document.getElementById('score').innerText = score;
        
        // RECUPERACIÓN DE VIDA: +20% por acierto (Máximo 100)
        playerHealth = Math.min(100, playerHealth + 20);
        
        // Recargar escudo si tiene 10+ respuestas
        if (score >= 10) playerShieldCharges = 3;
        
        // Recarga Munición en Modo 3
        if (currentGameMode === 3) {
            currentCannonAmmo = window.GLOBAL_CANNON_AMMO || 4;
            currentMissileAmmo = window.GLOBAL_MISSILE_AMMO || 2;
            updateShipTint();
        }
        
        if (gameLevel >= 2) {
            singularityCharges++;
            this.updateSingularityUI();
        }

        // RECOMPENSAS RPG
        if (activeProblem.type === "HEAL") {
            playerHealth = 100;
        } 
        else if (activeProblem.type === "SHIELD") {
            hasShield = true;
            shieldTimer = 10000; // 10 segundos Neon!
        }
        
        spawnEnemy(this); // Ganas = Nace enemigo
        
        if (currentGameMode === 3) {
            let totalEnemies = enemiesGroup.getChildren().length;
            if (totalEnemies < 20) { // Límite de seguridad para iPad
                if (score >= 6) {
                    // Spawn escalonado para no saturar las físicas en un solo frame
                    for(let k=0; k<4; k++) {
                        this.time.delayedCall(100 * (k+1), () => { if(!isGameOver) spawnEnemy(this); });
                    }
                } else if (score >= 5) {
                    this.time.delayedCall(100, () => { if(!isGameOver) spawnEnemy(this); });
                    this.time.delayedCall(200, () => { if(!isGameOver) spawnEnemy(this); });
                }
            }
        }
        
        if (score % 2 === 0) { spawnWall(this); } 
        
        // Explosion verde de victoria
        let ring = this.add.circle(coin.x, coin.y, 10, 0x00ff00);
        this.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 300, onComplete: () => { ring.destroy(); }});
        
        // Humo de victoria (Número gigante)
        let humoTxt = this.add.text(coin.x, coin.y, activeProblem.result.toString(), { fontSize: '40px', fill: '#00FF00', fontWeight: 'bold' });
        humoTxt.setOrigin(0.5);
        this.tweens.add({
            targets: humoTxt,
            scale: 6,
            alpha: 0,
            y: coin.y - 120, // flota hacia arriba como humo
            duration: 1200,
            ease: 'Power2',
            onComplete: () => humoTxt.destroy()
        });
        
        // CONTROL DE PROGRESIÓN MODO 3
        if (currentGameMode === 3 && score === 10) {
             gameLevel = 2;
             let lvlText = this.add.text(config.width/2, config.height/2, "¡RANGO ALCANZADO!\nENJAMBRE ACTIVADO", { fontSize: '40px', fill: '#00FFFF', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 });
             lvlText.setOrigin(0.5);
             this.tweens.add({ targets: lvlText, scale: 1.5, alpha: 0, duration: 3000, ease: 'Power1', hold: 1000, yoyo: true, onComplete: () => lvlText.destroy() });
             
             this.updateSingularityUI(); 
             
             enemiesGroup.getChildren().forEach(e => {
                  if(e.texture && e.texture.key === 'enemyShieldTex') e.setTint(0xff0000);
             });
        }
        
        // Control de Progreso Modos 1 y 2
        if (currentGameMode === 1) {
             currentStep++;
             if (currentStep > 10) {
                 currentStep = 1;
                 currentTableIndex++;
                 enemiesGroup.clear(true, true);
                 playLevelUp();
                 
                 let lvlText = this.add.text(config.width/2, config.height/2, "¡TABLA COMPLETADA!", { fontSize: '40px', fill: '#00FF00', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 });
                 lvlText.setOrigin(0.5);
                 this.tweens.add({ targets: lvlText, scale: 1.5, alpha: 0, duration: 3000, ease: 'Power1', hold: 1000, yoyo: true, onComplete: () => lvlText.destroy() });

                 if (currentTableIndex >= window.GLOBAL_VALID_TABLES.length) {
                     alert("¡Modo Secuencial Completado!");
                     window.returnToMenu();
                     return;
                 }
             }
        } else if (currentGameMode === 2) {
             pendingTableSteps = pendingTableSteps.filter(s => s !== activeProblem.b);
             if (pendingTableSteps.length === 0) {
                 currentTableIndex++;
                 pendingTableSteps = [1,2,3,4,5,6,7,8,9,10];
                 enemiesGroup.clear(true, true);
                 playLevelUp();

                 let lvlText = this.add.text(config.width/2, config.height/2, "¡TABLA COMPLETADA!", { fontSize: '40px', fill: '#00FF00', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 });
                 lvlText.setOrigin(0.5);
                 this.tweens.add({ targets: lvlText, scale: 1.5, alpha: 0, duration: 3000, ease: 'Power1', hold: 1000, yoyo: true, onComplete: () => lvlText.destroy() });

                 if (currentTableIndex >= window.GLOBAL_VALID_TABLES.length) {
                     alert("¡Modo Aleatorio por Tabla Completado!");
                     window.returnToMenu();
                     return;
                 }
             }
        }

        // Limpiar fase matematicas
        answersGroup.getChildren().forEach(c => { if(c.linkedText) c.linkedText.destroy(); });
        answersGroup.clear(true, true);
        
        if (currentGameMode === 3) {
            let targetIndex = activeProblem.index;
            if(activeProblem.blockRef) {
                 if(activeProblem.blockRef.linkedText) activeProblem.blockRef.linkedText.destroy();
                 if(activeProblem.blockRef.micIcon) activeProblem.blockRef.micIcon.destroy();
                 activeProblem.blockRef.destroy();
            }
            
            spawnSingleMathBlock(this, targetIndex);
            
            // Restaurar estado
            mathBlocksGroup.getChildren().forEach(b => { 
                 b.setAlpha(1); b.clearTint(); 
                 if(b.linkedText) b.linkedText.setAlpha(1);
                 if(b.micIcon) b.micIcon.setAlpha(1);
            });
        } else {
            spawnMathBlocks(this);
        }
        
        currentPhase = "WAITING_BLOCK";

    } else {
        // --- RESPUESTA FALSA ---
        playExplosion();
        this.cameras.main.shake(100, 0.01); 
        
        // Rebote Físico Coin
        let bounceP = new Phaser.Math.Vector2(player.x - coin.x, player.y - coin.y);
        bounceP.normalize().scale(500);
        player.body.setVelocity(bounceP.x, bounceP.y);

        let ring = this.add.circle(coin.x, coin.y, 10, 0xff0000);
        this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 200, onComplete: () => { ring.destroy(); }});
        
        if(coin.linkedText) coin.linkedText.destroy();
        coin.destroy();

        takeDamage(this, 20);
        spawnEnemy(this);
        
        // Añadir a registro de fallos
        let alreadyFailed = failedMath.find(f => f.a === activeProblem.a && f.b === activeProblem.b);
        if(!alreadyFailed) {
             failedMath.push({ a: activeProblem.a, b: activeProblem.b, errors: 1 });
        } else {
             alreadyFailed.errors += 1;
        }
    }
}

function spawnAnswerCoins(scene, prob) {
    let answers = [ prob.result ];
    
    while (answers.length < 3) {
         let offset = Phaser.Utils.Array.GetRandom([-1, 1, -2, 2, 5, 10, -5, -prob.a, prob.b]);
         let fake = prob.result + offset;
         if (fake > 0 && !answers.includes(fake)) {
              answers.push(fake);
         }
    }
    
    Phaser.Utils.Array.Shuffle(answers);
    
    let spawnedPositions = [];
    
    for (let i = 0; i < answers.length; i++) {
        let x, y;
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            x = Phaser.Math.Between(50, config.width - 50);
            y = Phaser.Math.Between(180, config.height - 80); 
            
            validPosition = true;
            
            for (let j = 0; j < spawnedPositions.length; j++) {
                if (Phaser.Math.Distance.Between(x, y, spawnedPositions[j].x, spawnedPositions[j].y) < 100) {
                    validPosition = false;
                    break;
                }
            }
            if (Phaser.Math.Distance.Between(x, y, player.x, player.y) < 150) {
                validPosition = false;
            }
        }
        
        spawnedPositions.push({x: x, y: y});
        
        let coin = answersGroup.create(x, y, 'coinTex');
        coin.body.setCircle(15);
        coin.setPushable(false); // fisica dura al chocar malo
        coin.isCorrect = (answers[i] === prob.result);
        
        scene.tweens.add({
            targets: coin,
            alpha: 0.4,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
        
        let numTxt = scene.add.text(x, y - 35, answers[i].toString(), { fontSize: '32px', fill: '#FFF', fontStyle: 'bold', fontFamily: 'Arial, sans-serif' });
        numTxt.setOrigin(0.5);
        numTxt.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2)); 
        coin.linkedText = numTxt;
    }
}

function spawnSinglePearl(scene, rad, radius, arcoGrozor) {
     let currentRadius = config.width * (window.GLOBAL_RING_RADIUS_PCT !== undefined ? window.GLOBAL_RING_RADIUS_PCT : 0.15);
     let centerY = config.height / 2 + (currentRadius * 0.5);
     let px = config.width / 2 + Math.cos(rad) * radius;
     let py = centerY + Math.sin(rad) * radius;
     
     let perla = ringGroup.create(px, py, 'perlaTex');
     perla.setOrigin(0.5);
     perla.body.setCircle(arcoGrozor/2);
     perla.setTint(0xFFFFFF);
     perla.setAlpha(0.7);
     
     scene.tweens.add({
         targets: perla,
         alpha: 0.2,
         duration: Phaser.Math.Between(500, 1000),
         yoyo: true,
         repeat: -1
     });
}

function spawnWall(scene) {
    let radius = config.width * 0.35;
    let arcoGrozor = 18;
    
    // Las perlas se ubican según la misma métrica simétrica
    let angularStep = Math.PI / 2; // 90 grados entre cruces
    let wallArc = Math.PI / 4; // 45 grados de muro inicial
    let numPerlasBase = 10;
    let perlaPaso = wallArc / (numPerlasBase - 1);
    let perlasPorCrecimiento = 3; // Crece de 3 en 3
    let maxGrowths = 3; // 3 crecimientos = 9 perlas extras por hueco
    
    let availableGaps = [];
    for(let i=0; i<4; i++) {
        if(gapGrowths[i] < maxGrowths) availableGaps.push(i);
    }
    
    if(availableGaps.length === 0) return; // Todo cerrado
    
    // Elegimos un hueco al azar para añadirle 3 perlas
    let chosenGap = Phaser.Utils.Array.GetRandom(availableGaps);
    let currentGrowths = gapGrowths[chosenGap];
    
    // Calcula dónde empieza a crecer el gap actual
    // Base + Muro inicial + (Las perlas que ya han crecido) + 1 paso para no pisar la anterior
    let startAngle = (angularStep * chosenGap) + wallArc + perlaPaso + (currentGrowths * perlasPorCrecimiento * perlaPaso);
    
    for(let j=0; j<perlasPorCrecimiento; j++) {
         let localRad = startAngle + (j * perlaPaso);
         let rad = localRad + globalRingRotation;
         spawnSinglePearl(scene, rad, radius, arcoGrozor);
    }
    
    gapGrowths[chosenGap]++;
}



/** Funciones Visuales Auxiliares **/

function createCustomTextures(scene) {
    let graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Textura Jugador (Levemente Isósceles estirado, no excesivo. Base clara, nariz extendida)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillTriangle(15, 0, 30, 36, 0, 36);
    graphics.generateTexture('playerTex', 30, 36);
    graphics.clear();
    
    // Textura Bala (Pequeño círculo celeste)
    graphics.fillStyle(0x00FFFF, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('bulletTex', 8, 8);
    graphics.clear();

    // Textura Enemigo Base (Blanca para que acepte tintes)
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillTriangle(15, 0, 30, 36, 0, 36);
    graphics.generateTexture('enemyTex', 30, 36);
    graphics.clear();

    // Textura Enemigo Elite / Escudo (Roja de nacimiento)
    graphics.fillStyle(0xFF0000, 1);
    graphics.fillTriangle(15, 0, 30, 36, 0, 36);
    graphics.generateTexture('enemyShieldTex', 30, 36);
    graphics.clear();

    // Textura Misil (Pequeño rombo/cruz)
    graphics.fillStyle(0xFF00FF, 1);
    graphics.fillRect(0, 4, 12, 4);
    graphics.fillRect(4, 0, 4, 12);
    graphics.generateTexture('missileTex', 12, 12);
    graphics.clear();

    // Texturas de Cajas de Matemática (Naranja, Verde, Neon) más grandes
    graphics.lineStyle(4, 0xFFFFFF);
    graphics.strokeRoundedRect(2, 2, 116, 46, 6);
    graphics.fillStyle(0xE65100, 1); // naranja
    graphics.fillRoundedRect(2, 2, 116, 46, 6);
    graphics.generateTexture('blockTex_orange', 120, 50);
    graphics.clear();

    graphics.lineStyle(4, 0xFFFFFF);
    graphics.strokeRoundedRect(2, 2, 116, 46, 6);
    graphics.fillStyle(0x00C853, 1); // verde sanador
    graphics.fillRoundedRect(2, 2, 116, 46, 6);
    graphics.generateTexture('blockTex_green', 120, 50);
    graphics.clear();
    
    graphics.lineStyle(4, 0x00FFFF); // borde neon
    graphics.strokeRoundedRect(2, 2, 116, 46, 6);
    graphics.fillStyle(0x008080, 1); // celeste oscuro interior
    graphics.fillRoundedRect(2, 2, 116, 46, 6);
    graphics.generateTexture('blockTex_cyan', 120, 50);
    graphics.clear();

    // Textura de Moneda Modificada (Totalmente blanca)
    graphics.lineStyle(3, 0xffffff);
    graphics.strokeCircle(15, 15, 13);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(15, 15, 6);
    graphics.generateTexture('coinTex', 30, 30);
    graphics.clear();

    // Textura para el rastro punteado (líneas curvas o segmentos como humo grueso)
    graphics.fillStyle(0xffffff, 1); 
    // Volvemos a círculos finos, ya que la forma del rectángulo no emite la rotación per se y luce como "barras"
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('trailTex', 8, 8);
}

function spawnEnemy(scene) {
    if ((currentGameMode === 1 || currentGameMode === 2) && enemiesGroup.getChildren().length >= 5) {
        return; // Máximo 5 naves en Modos 1 y 2
    }
    
    let x, y;
    let attempts = 0;
    do {
         x = Phaser.Math.Between(20, config.width - 20);
         y = Phaser.Math.Between(20, config.height - 20);
         attempts++;
    } while (Phaser.Math.Distance.Between(player.x, player.y, x, y) < 150 && attempts < 50); 

    let eKey = (USE_PRO_ASSETS && scene.textures.exists('enemy_pro')) ? 'enemy_pro' : 'enemyTex';
    let enemy = enemiesGroup.create(x, y, eKey);
    enemy.body.setCircle(12, 0, 0); 
    // Restablecido a 1 para evitar loop infinito de colisiones exponenciales
    enemy.body.setBounce(1, 1); 
    
    // Asignación de Puntos de Vida y Escudo
    enemy.hp = 1;
    let enemyColor = 0x000000; // Negro por defecto
    let baseScale = (USE_PRO_ASSETS && scene.textures.exists('enemy_pro')) ? (window.GLOBAL_ENEMY_SCALE || 0.1) : 1.0;
    
    if (currentGameMode === 3 && score >= 3) {
        let chance = (window.GLOBAL_SHIELD_CHANCE !== undefined) ? window.GLOBAL_SHIELD_CHANCE : 0.25;
        if (Math.random() < chance) {
            enemy.hp = 3;
            if (USE_PRO_ASSETS && scene.textures.exists('enemy_elite_pro')) {
                enemy.setTexture('enemy_elite_pro');
                baseScale = window.GLOBAL_ENEMY_ELITE_SCALE || 0.12; 
            } else {
                enemy.setTexture('enemyShieldTex');
                enemy.clearTint(); // Usa su color rojo natural
                baseScale = 1.15;
            }
        } else {
            if (!USE_PRO_ASSETS || !scene.textures.exists('enemy_pro')) {
                enemy.setTint(enemyColor);
            }
        }
    } else {
        if (!USE_PRO_ASSETS || !scene.textures.exists('enemy_pro')) {
            enemy.setTint(enemyColor);
        }
    }
    
    // Ajustar hitbox para enemigos pro
    if (USE_PRO_ASSETS && scene.textures.exists('enemy_pro')) {
        enemy.body.setCircle(enemy.width * 0.45, enemy.width * 0.05, enemy.height * 0.05);
    }
    
    let randomAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    let speeds = [130, 160, 200]; 
    let currentSpeed = Phaser.Utils.Array.GetRandom(speeds) + (score * 5); 
    
    scene.physics.velocityFromRotation(randomAngle, currentSpeed, enemy.body.velocity);
    
    enemy.setScale(0);
    scene.tweens.add({
        targets: enemy,
        scale: baseScale,
        duration: 400,
        ease: 'Back.easeOut'
    });
}

function actualizarBarraVidaGrafica(scene) {
    if (!healthBarGraphics) return;
    
    let gameW = scene.cameras.main.width;
    healthBarGraphics.clear();
    healthBarGraphics.setDepth(3000);
    
    let w = 240; // Más corta (longitud)
    let h = 40;  // Más ancha (grosor)
    let x = gameW - w - 20; 
    let y = 120 + (window.GLOBAL_TOP_OFFSET || 0); 
    
    // 1. Sombra exterior
    healthBarGraphics.fillStyle(0x000000, 0.4);
    healthBarGraphics.fillRoundedRect(x + 4, y + 4, w, h, 10);
    
    // 2. Fondo del contenedor
    healthBarGraphics.fillStyle(0x111111, 0.9);
    healthBarGraphics.fillRoundedRect(x, y, w, h, 10);
    
    // 3. Borde Neon
    let colorNeon = playerHealth > 30 ? 0x00FFFF : 0xFF0055;
    healthBarGraphics.lineStyle(3, colorNeon, 1);
    healthBarGraphics.strokeRoundedRect(x, y, w, h, 10);
    
    // 4. Relleno con DEGRADADO
    if (playerHealth > 0) {
        let fillW = (playerHealth / 100) * (w - 8);
        
        let c1 = 0x00FF88; // Verde arriba
        let c2 = 0x009944; // Verde abajo
        if (playerHealth <= 60) { c1 = 0xFFCC00; c2 = 0xAA8800; }
        if (playerHealth <= 30) { c1 = 0xFF3300; c2 = 0x880000; }
        
        // Aplicar degradado vertical
        healthBarGraphics.fillGradientStyle(c1, c1, c2, c2, 1);
        healthBarGraphics.fillRoundedRect(x + 4, y + 4, fillW, h - 8, 8);
        
        // Brillo superior para efecto cristal
        healthBarGraphics.fillStyle(0xFFFFFF, 0.2);
        healthBarGraphics.fillRoundedRect(x + 4, y + 4, fillW, (h - 8) / 2, 4);
    }
    
    if (healthBarText) {
        healthBarText.setText(`${playerHealth}% HP`);
        healthBarText.setFontSize('22px'); // Texto más grande
        healthBarText.setX(x + w / 2); 
        healthBarText.setY(y + h / 2);
        healthBarText.setDepth(3001);
        healthBarText.setStyle({ fill: '#FFF', stroke: '#000', strokeThickness: 4 }); // Contorno negro para legibilidad
        healthBarText.setVisible(true);
    }
}

function obtenerVidaSegmentada(hp) {
    let segs = Math.ceil(hp / 10);
    return "❤️ " + "█".repeat(segs) + "░".repeat(10 - segs) + ` ${hp}%`;
}

function takeDamage(scene, amount) {
    // Escudo defensivo reactivo por cargas (Modo 3, 10+ respuestas)
    if (currentGameMode === 3 && score >= 10 && playerShieldCharges > 0) {
        playerShieldCharges--;
        
        // Efecto visual instantáneo del escudo
        playShieldSound();
        let reactionShield = scene.add.circle(player.x, player.y, 40);
        reactionShield.setStrokeStyle(4, 0x00FFFF, 1);
        scene.tweens.add({
            targets: reactionShield,
            scale: 1.5,
            alpha: 0,
            duration: 400,
            onUpdate: () => { reactionShield.setPosition(player.x, player.y); },
            onComplete: () => reactionShield.destroy()
        });
        return; // Bloquea el daño consumiendo carga
    }

    if (hasShield) {
        // Lógica para escudo de Power-up (item) si existiera
        return;
    }

    playerHealth -= amount;
    if (playerHealth < 0) playerHealth = 0;
    
    // Titilar rojo la UI de HP
    // Efecto visual en la nueva barra
    healthBarText.setText(`${playerHealth}%`);
    healthBarText.setTint(0xff0000);
    scene.tweens.add({
        targets: healthBarText,
        scale: 1.2,
        yoyo: true,
        duration: 100,
        onComplete: () => { 
            healthBarText.clearTint(); 
            healthBarText.setScale(1);
        }
    });

    if (playerHealth <= 0) {
        triggerGameOver(scene);
    }
}

function updateShipTint() {
    if (USE_PRO_ASSETS) {
        player.clearTint();
        return;
    }
    if (currentGameMode === 3 && currentCannonAmmo > 0) {
        let maxAmmo = window.GLOBAL_CANNON_AMMO || 4;
        let ratio = currentCannonAmmo / maxAmmo;
        // Celeste = R variable, G y B full
        let r = Math.floor(255 - (255 * ratio));
        let hexColor = (r << 16) | (255 << 8) | 255;
        player.setTint(hexColor);
    } else {
        player.clearTint();
    }
}

function hitEnemyWithWeapon(weapon, enemy) {
    if (!enemy.active || !weapon.active) return;
    
    let scene = enemy.scene;
    let damage = (weapon.texture && weapon.texture.key === 'missileTex') ? 3 : 1;
    enemy.hp -= damage;
    
    // Destruir rastro de forma segura
    if (weapon.trail) {
        weapon.trail.destroy();
    }
    
    if (enemy.hp > 0) {
        // El escudo resistió el impacto
        playTone(400, 'triangle', 0.1); 
        
        // Efecto visual usando la escena del enemigo (que sigue activo)
        let hitRing = scene.add.circle(enemy.x, enemy.y, 20);
        hitRing.setStrokeStyle(3, 0xff0000, 1);
        scene.tweens.add({ 
            targets: hitRing, scale: 2, alpha: 0, duration: 300, 
            onComplete: () => { hitRing.destroy(); }
        });
        
        // Degradar color de escudo progresivamente
        if (enemy.hp === 2) {
            enemy.setTint(0x880000); // Rojo Granate (Dañado)
        } else {
            // Escudo roto: Cambia a textura normal, escala normal y color negro
            enemy.setTexture('enemyTex');
            enemy.setTint(0x000000); 
            enemy.setScale(1.0);
        }
        
        weapon.destroy(); 
        return; 
    }
    
    // Golpe fatal
    playExplosion();
    let ring = scene.add.circle(enemy.x, enemy.y, 10, 0xff0000);
    scene.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 200, onComplete: () => { ring.destroy(); }});
    
    weapon.destroy();
    enemy.destroy();
}

function hitEnemy(player, enemy) {
    if(isGameOver) return;

    if (hasShield) { // Escudo Neon rompe enemigos!
        playExplosion();
        let ring = this.add.circle(enemy.x, enemy.y, 15, 0x00FFFF);
        this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 200, onComplete: () => { ring.destroy(); }});
        enemy.destroy();
        this.cameras.main.shake(50, 0.005);
        return;
    }
    
    // Si no hay escudo, rebote dramático y daño
    playExplosion();
    this.cameras.main.shake(100, 0.01);
    
    let bouncePoint = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y);
    bouncePoint.normalize().scale(500);
    player.body.setVelocity(bouncePoint.x, bouncePoint.y);
    // Para que no sigamos arrastrando al instante con el mouse, bloqueamos el target un instante si quisieramos
    // Pero el Lerp físico lo estabilizara rápido.
    takeDamage(this, 20);
}

function triggerGameOver(scene) {
    isGameOver = true;
    clearArrivalSonar(scene);
    playerInputFrozen = false;
    releaseFreezeWhenPointerNear = false;
    player.setTint(0xff0000);
    player.body.moves = false;
    trailEmitter.stop();

    let deathParticles = scene.add.particles(0, 0, 'playerTex', {
        x: player.x,
        y: player.y,
        speed: { min: -200, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        lifespan: 1000,
        blendMode: 'ADD',
        quantity: 15
    });

    player.setVisible(false);

    setTimeout(() => {
        let btnBg = scene.add.rectangle(config.width/2, config.height/2, 200, 60, 0x000000, 0.8);
        btnBg.setDepth(100);
        let govText = scene.add.text(config.width/2, config.height/2, "RESTART", { fontSize: '28px', fill: '#FFF', align: 'center', fontWeight: 'bold' });
        govText.setOrigin(0.5);
        govText.setDepth(101);
        
        btnBg.setInteractive({ useHandCursor: true });
        
        btnBg.on('pointerdown', () => {
             isGameOver = false; 
             activeProblem = null; 
             playerHealth = 100;
             hasShield = false;
             score = 0;
             document.getElementById('score').innerText = score;
             currentPhase = "WAITING_BLOCK";
             scene.scene.restart(); 
        });

        scene.tweens.add({
            targets: [govText, btnBg],
            scale: 1.1,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }, 500);
}

function hitRingWall(player, ringSegment) {
    if(isGameOver) return;
    
    // Si estamos en Modo Pro, aumentamos la fuerza de rebote
    if (window.USE_PRO_ASSETS) {
        let bounceForce = 450;
        let angle = Phaser.Math.Angle.Between(ringSegment.x, ringSegment.y, player.x, player.y);
        player.body.setVelocity(Math.cos(angle) * bounceForce, Math.sin(angle) * bounceForce);
        
        // Pequeño efecto visual de impacto
        let scene = ringSegment.scene;
        let spark = scene.add.circle(player.x, player.y, 5, 0x00ffff);
        scene.tweens.add({ targets: spark, scale: 4, alpha: 0, duration: 200, onComplete: () => spark.destroy() });
    }
}

function dibujarAnilloCentral(scene) {
    let currentRadius = config.width * (window.GLOBAL_RING_RADIUS_PCT !== undefined ? window.GLOBAL_RING_RADIUS_PCT : 0.15);
    let centerY = config.height / 2 + (currentRadius * 0.5);
    
    if (window.centralRingGraphic) window.centralRingGraphic.destroy();
    window.centralRingGraphic = scene.add.graphics();
    window.centralRingGraphic.lineStyle(2, 0xD84315, 0.4); 
    
    // Dibujar anillo con apertura (arco roto)
    // Apertura de 1.5 naves (36px aprox) -> Angulo de unos 60 grados para ese radio
    let openingAngle = 1.0; // aprox 57 grados
    let startAngle = globalRingRotation;
    let endAngle = globalRingRotation + (Math.PI * 2) - openingAngle;
    
    window.centralRingGraphic.beginPath();
    window.centralRingGraphic.arc(config.width/2, centerY, currentRadius, startAngle, endAngle);
    window.centralRingGraphic.strokePath();
}

function dibujarYCrearParedesAnillo(scene) {
    let arcoGrozor = 18;
    
    // Textura de perla brillante
    if (!scene.textures.exists('perlaTex')) {
        let gr = scene.make.graphics();
        gr.fillStyle(0xFFFFFF, 1);
        gr.fillCircle(arcoGrozor/2, arcoGrozor/2, arcoGrozor/2);
        gr.generateTexture('perlaTex', arcoGrozor, arcoGrozor);
        gr.clear();
    }

    gapGrowths = [0, 0, 0, 0];
    let radius = config.width * 0.35;
    let angularStep = Math.PI / 2;
    let wallArc = Math.PI / 4;
    let numPerlasBase = 10;
    let perlaPaso = wallArc / (numPerlasBase - 1);

    // 4 Muros iniciales completamente simétricos en cruz
    for (let i = 0; i < 4; i++) {
        let baseAngle = angularStep * i; 
        
        for (let j = 0; j < numPerlasBase; j++) {
             let rad = baseAngle + (j * perlaPaso);
             spawnSinglePearl(scene, rad, radius, arcoGrozor);
        }
    }
}

function fireCannons(scene) {
    if (currentCannonAmmo <= 0) return;
    if (scene.time.now < lastFireTime + 500) return; // Limite de fuego (rate)
    
    // Consumir municion comun
    currentCannonAmmo--;
    updateShipTint();
    lastFireTime = scene.time.now;
    playLaser();
    
    let bulletSpeed = window.GLOBAL_BULLET_SPEED || 800;
    let cannonOffsets = [];
    
    if (score >= 8) cannonOffsets = [0, -15, 15, -30, 30]; // 5 cañones
    else if (score >= 7) cannonOffsets = [-10, 10, -25, 25]; // 4 cañones
    else if (score >= 6) cannonOffsets = [-15, 15]; // 2 cañones
    else if (score >= 5) cannonOffsets = [0]; // 1 cañon
    
    let baseAngle = player.rotation - Math.PI / 2;
    
    for (let offset of cannonOffsets) {
        let ox = Math.cos(baseAngle + Math.PI/2) * offset;
        let oy = Math.sin(baseAngle + Math.PI/2) * offset;
        let bx = player.x + Math.cos(baseAngle) * 20 + ox;
        let by = player.y + Math.sin(baseAngle) * 20 + oy;
        
        let bKey = (USE_PRO_ASSETS && scene.textures.exists('bullet_pro')) ? 'bullet_pro' : 'bulletTex';
        let bullet = bulletsGroup.create(bx, by, bKey);
        if (bullet) {
            if (USE_PRO_ASSETS) {
                bullet.setScale(0.07); // Reducido a 0.07 como solicitado
                bullet.rotation = baseAngle; 
            } else {
                bullet.setScale(1.0);
                bullet.rotation = 0;
            }
            bullet.body.setCircle(4);
            bullet.setVelocity(Math.cos(baseAngle) * bulletSpeed, Math.sin(baseAngle) * bulletSpeed);
            scene.time.delayedCall(2000, () => {
                if (bullet.active) bullet.destroy();
            });
        }
    }
}

let lastMissileTime = 0;
function fireMissiles(scene, target) {
    if (currentMissileAmmo <= 0) return;
    if (scene.time.now < lastMissileTime + 1000) return; 
    
    // Los misiles consumen su propia munición
    currentMissileAmmo--;
    updateShipTint();
    lastMissileTime = scene.time.now;
    playMissileLaunch();
    
    let numMissiles = (score >= 9) ? 4 : 2;
    
    for (let i = 0; i < numMissiles; i++) {
        let mx = player.x + Phaser.Math.Between(-20, 20);
        let my = player.y + Phaser.Math.Between(-20, 20);
        let mKey = (USE_PRO_ASSETS && scene.textures.exists('missile_pro')) ? 'missile_pro' : 'missileTex';
        let missile = missilesGroup.create(mx, my, mKey);
        if (missile) {
            if (USE_PRO_ASSETS) missile.setScale(0.1);
            else missile.setScale(1.0);
            missile.target = target;
            missile.birthTime = scene.time.now;
            missile.randomOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
            missile.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
            
            let trail = scene.add.particles(0, 0, 'bulletTex', { 
                speed: 0, scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 }, lifespan: 300, blendMode: 'ADD'
            });
            trail.startFollow(missile);
            missile.trail = trail;
            
            scene.time.delayedCall(4000, () => {
                if (missile.active) {
                    if (missile.trail) missile.trail.destroy();
                    missile.destroy();
                }
            });
        }
    }
}
