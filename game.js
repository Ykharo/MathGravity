const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth > 600 ? 600 : window.innerWidth, // Estilo mobile responsivo
    height: window.innerHeight,
    backgroundColor: '#F57C00', // Fondo naranja
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

// Nuevas variables Survival 
let playerHealth = 100;
let healthBarText;
let hasShield = false;
let shieldTimer = 0;
let shieldGraphics = null;
let shieldText = null;

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

// --- AUDIO SYSTEM (Oscillators & TTS) ---
function playTone(freq, type, duration) {
    if (!window.GLOBAL_AUDIO_CTX) return;
    let osc = window.GLOBAL_AUDIO_CTX.createOscillator();
    let gain = window.GLOBAL_AUDIO_CTX.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, window.GLOBAL_AUDIO_CTX.currentTime);
    gain.gain.setValueAtTime(0.1, window.GLOBAL_AUDIO_CTX.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, window.GLOBAL_AUDIO_CTX.currentTime + duration);
    osc.connect(gain);
    gain.connect(window.GLOBAL_AUDIO_CTX.destination);
    osc.start();
    osc.stop(window.GLOBAL_AUDIO_CTX.currentTime + duration);
}

function playExplosion() {
    playTone(100, 'square', 0.2);
    setTimeout(() => playTone(50, 'sawtooth', 0.3), 50);
}

function playSuccess() {
    playTone(400, 'sine', 0.1);
    setTimeout(() => playTone(600, 'sine', 0.2), 100);
}

function playLevelUp() {
    playTone(300, 'square', 0.1);
    setTimeout(() => playTone(400, 'square', 0.1), 100);
    setTimeout(() => playTone(500, 'square', 0.2), 200);
    setTimeout(() => playTone(800, 'sine', 0.4), 300);
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-LA'; // Español Latinoamericano
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    }
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
    // Al ser minimalista, no cargamos imágenes externas. Dibujaremos todo dinámicamente con Phaser Graphics.
    // Pero para aprovechar el sistema de físicas y partículas de Phaser fácilmente,
    // vamos a usar un truco: generamos texturas basándonos en gráficos dibujados en memoria.
}

function create() {
    window.gameScene = this; // Exponer la capa de escena actual a la interfaz HTML
    
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
            this.cameras.main.setBackgroundColor('#404040');
            
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
        
        score = 0;
        gameLevel = 1;
        playerHealth = 100;
        healthBarText.setText(obtenerVidaSegmentada(playerHealth));
        document.getElementById('score').innerText = score;
        
        player.setPosition(this.cameras.main.centerX, this.cameras.main.centerY + 150);
        player.setVelocity(0,0);
        
        enemiesGroup.clear(true, true);
        answersGroup.getChildren().forEach(c => { if(c.linkedText) c.linkedText.destroy(); });
        answersGroup.clear(true, true);
        mathBlocksGroup.getChildren().forEach(b => { if(b.linkedText) b.linkedText.destroy(); });
        mathBlocksGroup.clear(true, true);
        
        currentPhase = "WAITING_BLOCK";
        isGamePaused = false;
        isGameOver = false;
        
        spawnMathBlocks(this);
    };

    this.returnToMenu = () => {
        currentGameMode = 0;
        mathBlocksGroup.getChildren().forEach(b => { if(b.linkedText) b.linkedText.destroy(); });
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

    // 2. Decoración de Fondo (Anillo punteado central)
    dibujarAnilloCentral(this);

    // 3. Crear al Jugador
    player = this.physics.add.sprite(this.cameras.main.centerX, this.cameras.main.centerY + 150, 'playerTex');
    player.setCollideWorldBounds(true);
    // Ajustar el hitbox (caja de colisión) un poco más pequeño para ser indulgente
    player.body.setCircle(10, 0, 0); 
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
    
    // spawnMathBlocks(this); // Ahora se invoca desde startGameMode()

    // 7. Colisiones y Físicas Generales
    this.physics.add.collider(player, enemiesGroup, hitEnemy, null, this);
    this.physics.add.collider(player, ringGroup);
    this.physics.add.collider(enemiesGroup, ringGroup);

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
    
    // Textura dinámica UI de Vida a la esquina superior derecha
    healthBarText = this.add.text(config.width - 20, 30, obtenerVidaSegmentada(playerHealth), { fontSize: '18px', fill: '#FFF', fontStyle: 'bold', align: 'right', fontFamily: 'monospace' });
    healthBarText.setOrigin(1, 0.5);
    
    // Escudo visual base (Oculto)
    shieldGraphics = this.add.graphics();
    shieldText = this.add.text(0, 0, "", { fontSize: '18px', fill: '#0ff', fontStyle: 'bold' });
    shieldText.setOrigin(0.5);

    // 8. Controles (Seguir el ratón / Dedo táctil)
    this.input.on('pointermove', function (pointer) {
        if (!isGameOver) {
            targetX = pointer.x;
            targetY = pointer.y;
        }
    }, this);
    
    // Al hacer click/touch se actualiza el target si se está jugando
    this.input.on('pointerdown', function (pointer) {
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
            this.cameras.main.setBackgroundColor('#F57C00');
        }
    }

    // Actualizar rotaciones físicas y visuales al mismo tiempo (perlas visibles circulares)
    let rotAmount = 0.003 * timeDilation;
    globalRingRotation += rotAmount;
    Phaser.Actions.RotateAroundDistance(ringGroup.getChildren(), { x: config.width / 2, y: config.height / 2 }, rotAmount, config.width * 0.35);

    // Configuración Variables Vivo
    let tension = window.GLOBAL_TENSION || 8;
    let engineForce = window.GLOBAL_ENGINE || 0;
    let radioGiroFuerza = window.GLOBAL_RADIO_GIRO || 8.0;
    
    // Aceleración de Auto-Motor (siempre hacia donde apunta la nariz visiblemente, sea estacionario o inercial)
    let anguloVisual = player.rotation - Math.PI / 2; 
    let engX = Math.cos(anguloVisual) * engineForce;
    let engY = Math.sin(anguloVisual) * engineForce;
    
    if (window.GLOBAL_AUTOPILOT) {
        // Sonar Visual (Emite un pulso verde circular cada medio segundo)
        if (!this.lastSonarTime || this.time.now > this.lastSonarTime + 500) {
            this.lastSonarTime = this.time.now;
            let sonar = this.add.circle(player.x, player.y, 10);
            sonar.setStrokeStyle(3, 0x00FF00, 0.4); 
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
    if (player.body.velocity.lengthSq() > 2) { 
        player.rotation = player.body.velocity.angle() + Math.PI / 2;
    }

    // Actualizar visuales del SHIELD si está activo
    if (hasShield) {
        shieldGraphics.clear();
        shieldGraphics.lineStyle(3, 0x00FFFF, 1);
        shieldGraphics.beginPath();
        shieldGraphics.arc(player.x, player.y, 25, 0, Math.PI * 2);
        shieldGraphics.strokePath();
        
        shieldText.setPosition(player.x, player.y - 45);
        
        shieldTimer -= (1000/60); // approx delta
        if (shieldTimer <= 0) {
            hasShield = false;
            shieldGraphics.clear();
            shieldText.setText("");
        } else {
            shieldText.setText((shieldTimer / 1000).toFixed(1) + "s");
        }
    }

    // Lógica Evolutiva de Enemigos
    enemiesGroup.children.iterate(function (enemy) {
        if(enemy && enemy.active) {
             if (gameLevel === 1 || currentGameMode === 1 || currentGameMode === 2) {
                 enemy.rotation += 0.05; // Tontos pero con giro independiente
             } else if (gameLevel === 2 && currentGameMode === 3) {
                 // Nivel 2: Comportamiento Enjambre Cazador (Swarm - Boids)
                 let anguloJugador = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
                 
                 // Singularidad: Giran lenamente arrastrados por la gelatina
                 let anguloObjetivo = anguloJugador + Math.PI / 2;
                 let diff = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(enemy.rotation), Phaser.Math.RadToDeg(anguloObjetivo));
                 enemy.rotation += Phaser.Math.DegToRad(diff) * (timeDilation === 1.0 ? 1.0 : 0.05 * timeDilation);
                 
                 // Vector Atracción al Jugador (Seek) aplastado por el tiempo
                 let speed = 45 * timeDilation;
                 let vX = Math.cos(anguloJugador) * speed;
                 let vY = Math.sin(anguloJugador) * speed;
                 
                 // Vector Separación
                 enemiesGroup.getChildren().forEach(otro => {
                     if (otro !== enemy && otro.active) {
                         let dx = enemy.x - otro.x;
                         let dy = enemy.y - otro.y;
                         let dist2 = dx*dx + dy*dy;
                         if (dist2 > 0 && dist2 < 2500) { 
                             let distReal = Math.sqrt(dist2);
                             let panicoGrupal = (50 - distReal) * 2 * timeDilation; // Efecto frenado
                             vX += (dx / distReal) * panicoGrupal;
                             vY += (dy / distReal) * panicoGrupal;
                         }
                     }
                 });
                 
                 // Forzamos las velocidades vectorizadas mezcladas
                 enemy.body.setVelocity(vX, vY);
             }
        }
    });

    // Animación visual del anillo central o decoraciones se haría aquí
}

/** Funciones Lógicas del Juego **/

function spawnSingleMathBlock(scene, i, forcedA = null, forcedB = null) {
    let blockWidth = 120;
    let blockHeight = 50;
    let spacing = config.width / 4;
    let x = (spacing * i) + (spacing / 2);
    let y = 90; 

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
    
    scene.tweens.add({
        targets: [block, txt],
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

    // Apagar visualmente los demás bloques temporales
    mathBlocksGroup.getChildren().forEach(b => { 
        if (b !== block) {
            b.setAlpha(0.2); 
            if(b.linkedText) b.linkedText.setAlpha(0.2);
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
        
        score += 1;
        document.getElementById('score').innerText = score;
        
        if (gameLevel >= 2) {
            singularityCharges++;
            this.updateSingularityUI();
        }

        // RECOMPENSAS RPG
        if (activeProblem.type === "HEAL") {
            playerHealth = 100;
            // Titilar verde
            healthBarText.setText(obtenerVidaSegmentada(playerHealth));
            healthBarText.setTint(0x00FF00);
            this.tweens.add({ targets: healthBarText, scale: 1.3, yoyo: true, repeat: 3, duration: 200, onComplete: () => { healthBarText.clearTint(); healthBarText.setScale(1); }});
        } 
        else if (activeProblem.type === "SHIELD") {
            hasShield = true;
            shieldTimer = 10000; // 10 segundos Neon!
        }
        
        spawnEnemy(this); // Ganas = Nace enemigo
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
        if (currentGameMode === 3 && score % 15 === 0 && score > 0) {
             gameLevel = 2;
             let lvlText = this.add.text(config.width/2, config.height/2, "¡RANGO ALCANZADO!\nNIVEL AUMENTADO", { fontSize: '40px', fill: '#00FFFF', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 });
             lvlText.setOrigin(0.5);
             this.tweens.add({ targets: lvlText, scale: 1.5, alpha: 0, duration: 3000, ease: 'Power1', hold: 1000, yoyo: true, onComplete: () => lvlText.destroy() });
             
             this.updateSingularityUI(); 
             
             enemiesGroup.getChildren().forEach(e => {
                  e.setTint(0xff0000);
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
                 activeProblem.blockRef.destroy();
            }
            
            spawnSingleMathBlock(this, targetIndex);
            
            // Restaurar estado
            mathBlocksGroup.getChildren().forEach(b => { 
                 b.setAlpha(1); b.clearTint(); 
                 if(b.linkedText) b.linkedText.setAlpha(1);
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
    
    for (let i = 0; i < answers.length; i++) {
        let x = Phaser.Math.Between(50, config.width - 50);
        let y = Phaser.Math.Between(180, config.height - 80); 
        
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
     let px = config.width / 2 + Math.cos(rad) * radius;
     let py = config.height / 2 + Math.sin(rad) * radius;
     
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

    // Textura Enemigo (Triángulo Oscuro correlativo)
    graphics.fillStyle(0x333333, 1);
    graphics.fillTriangle(15, 0, 30, 36, 0, 36);
    graphics.generateTexture('enemyTex', 30, 36);
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
    do {
         x = Phaser.Math.Between(20, config.width - 20);
         y = Phaser.Math.Between(20, config.height - 20);
    } while (Phaser.Math.Distance.Between(player.x, player.y, x, y) < 150); 

    let enemy = enemiesGroup.create(x, y, 'enemyTex');
    enemy.body.setCircle(12, 0, 0); 
    // Restablecido a 1 para evitar loop infinito de colisiones exponenciales
    enemy.body.setBounce(1, 1); 
    
    // Si estamos en nivel 2 avanzardo, nacen ya furiosos
    if (gameLevel === 2) {
        enemy.setTint(0xff0000);
    }
    
    let randomAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    let speeds = [130, 160, 200]; 
    let currentSpeed = Phaser.Utils.Array.GetRandom(speeds) + (score * 5); 
    
    scene.physics.velocityFromRotation(randomAngle, currentSpeed, enemy.body.velocity);
    
    enemy.setScale(0);
    scene.tweens.add({
        targets: enemy,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut'
    });
}

function obtenerVidaSegmentada(hp) {
    if (hp <= 0) return "[          ] 0%";
    let bloques = Math.ceil(hp / 10);
    let bar = "[" + "#".repeat(bloques) + " ".repeat(10 - bloques) + "]";
    return `${bar} ${hp}%`;
}

function takeDamage(scene, amount) {
    playerHealth -= amount;
    if (playerHealth < 0) playerHealth = 0;
    
    // Titilar rojo la UI de HP
    healthBarText.setText(obtenerVidaSegmentada(playerHealth));
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

function hitRing(player, ringSegment) {
    if(isGameOver) return;
}

function dibujarAnilloCentral(scene) {
    let gfx = scene.add.graphics();
    gfx.lineStyle(1, 0xD84315, 0.4); 
    gfx.strokeCircle(config.width/2, config.height/2, config.width * 0.35);
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
