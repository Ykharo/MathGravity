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

// Variables para el rastro y movimiento fluido
let targetX = 0;
let targetY = 0;
let trailEmitter;

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
    
    // 5.1 Crear contenedor de paredes rotatorias
    ringObstacles = this.add.container(config.width/2, config.height/2);
    this.tweens.add({
        targets: ringObstacles,
        angle: 360,
        duration: 30000,
        repeat: -1
    });

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
    
    spawnMathBlocks(this); // Generar los bloques top (las 3 o 4 cajas)

    // 7. Colisiones y Físicas Generales
    this.physics.add.collider(player, enemiesGroup, hitEnemy, null, this);
    this.physics.add.collider(player, ringGroup);
    this.physics.add.collider(enemiesGroup, ringGroup);

    // Colisión de Menú Top (Aceptar misión del bloque con rebote)
    this.physics.add.collider(player, mathBlocksGroup, hitMathBlock, null, this);
    
    // Colisiones con Monedas Creadas (Respuestas)
    // Usamos collider en vez de overlap para poder rebotar en las falsas. Resolvelo en la función logica
    this.physics.add.collider(player, answersGroup, hitAnswerCoin, null, this);
    
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

    // Actualizar dinámicamente las rotaciones de las físicas del grupo del contenedor para sincronizar visual y colisionador
    Phaser.Actions.RotateAroundDistance(ringGroup.getChildren(), { x: config.width / 2, y: config.height / 2 }, 0.003 * timeDilation, config.width * 0.35);
    
    // Sincronizar rotación visual con la rotación física del bucle
    ringGroup.children.iterate(function (wall) {
        if(wall) wall.rotation += 0.003 * timeDilation;
    });

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
             if (gameLevel === 1) {
                 enemy.rotation += 0.05; // Tontos pero con giro independiente
             } else if (gameLevel === 2) {
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

function spawnSingleMathBlock(scene, i) {
    let blockWidth = 120;
    let blockHeight = 50;
    let spacing = config.width / 4;
    let x = (spacing * i) + (spacing / 2);
    let y = 90; 

    let blockType = "NORMAL";
    let tex = 'blockTex_orange';
    
    let randType = Math.random();
    if (playerHealth <= 75 && randType < 0.20) {
        blockType = "HEAL";
        tex = 'blockTex_green';
    } else if (randType > 0.85 && randType <= 0.95) { 
        blockType = "SHIELD";
        tex = 'blockTex_cyan';
    }

    let block = mathBlocksGroup.create(x, y, tex);
    block.body.setSize(blockWidth, blockHeight);
    
    let factorA, factorB;
    let resolucionInedita = false;
    let fallbackPuroAleatorio = false; // Bandera de rescate numérico
    let abortSafety = 0;
    
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
             // Forzar creación desde cero
             factorA = Phaser.Math.Between(1, 10);
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
    
    block.mathData = { a: factorA, b: factorB, result: factorA * factorB, type: blockType, index: i };
    
    let txt = scene.add.text(x, y, `${factorA}x${factorB}`, { fontSize: '30px', fill: '#FFF', align: 'center', fontWeight: 'bold', fontFamily: 'Comic Sans MS, cursive' });
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
    mathBlocksGroup.clear(true, true);
    mathTextsGroup.clear(true, true);
    for (let i = 0; i < 4; i++) {
        spawnSingleMathBlock(scene, i);
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
        
        // CONTROL DE PROGRESIÓN (Score 10 -> Switch Nivel 2)
        if (score === 10 && gameLevel === 1) {
             gameLevel = 2;
             let lvlText = this.add.text(config.width/2, config.height/2, "¡RANGO ALCANZADO!\nINICIANDO NIVEL 2", { fontSize: '40px', fill: '#00FFFF', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 });
             lvlText.setOrigin(0.5);
             this.tweens.add({ targets: lvlText, scale: 1.5, alpha: 0, duration: 3000, ease: 'Power1', hold: 1000, yoyo: true, onComplete: () => lvlText.destroy() });
             
             this.updateSingularityUI(); // Revelar arma temporal
             
             // Mutar enemigos existentes a color rojo letal indicando furia rastreadora
             enemiesGroup.getChildren().forEach(e => {
                  e.setTint(0xff0000);
             });
        }
        
        // Limpiar fase matematicas
        answersGroup.getChildren().forEach(c => { if(c.linkedText) c.linkedText.destroy(); });
        answersGroup.clear(true, true);
        
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
        
        currentPhase = "WAITING_BLOCK";

    } else {
        // --- RESPUESTA FALSA ---
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
        
        let numTxt = scene.add.text(x, y - 35, answers[i].toString(), { fontSize: '32px', fill: '#FFF', fontStyle: 'bold', fontFamily: 'Comic Sans MS, sans-serif' });
        numTxt.setOrigin(0.5);
        numTxt.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2)); 
        coin.linkedText = numTxt;
    }
}

function spawnWall(scene) {
    let radius = config.width * 0.35;
    let createdWalls = ringGroup.getChildren().length;
    let rad = (Math.PI * 2 / 12) * createdWalls; 
    
    let x = config.width / 2 + Math.cos(rad) * radius;
    let y = config.height / 2 + Math.sin(rad) * radius;
    
    let wall = ringGroup.create(x, y, 'wallTex');
    wall.rotation = rad + Math.PI/2;
    let arcoGrozor = 20;
    let arcoLongitud = 120; 
    wall.body.setSize(arcoLongitud, arcoGrozor);
    wall.setTint(0xFFFFFF);
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
    let x, y;
    do {
         x = Phaser.Math.Between(20, config.width - 20);
         y = Phaser.Math.Between(20, config.height - 20);
    } while (Phaser.Math.Distance.Between(player.x, player.y, x, y) < 150); 

    let enemy = enemiesGroup.create(x, y, 'enemyTex');
    enemy.body.setCircle(12, 0, 0); 
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
        let ring = this.add.circle(enemy.x, enemy.y, 15, 0x00FFFF);
        this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 200, onComplete: () => { ring.destroy(); }});
        enemy.destroy();
        this.cameras.main.shake(50, 0.005);
        return;
    }
    
    // Si no hay escudo, rebote dramático y daño
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
    let radius = config.width * 0.35;
    
    let arcoGrozor = 18;
    let arcoLongitudVisual = 120; 
    let gr = scene.make.graphics();
    gr.fillStyle(0xFFFFFF, 1);
    
    gr.fillRoundedRect(-arcoLongitudVisual/2, -arcoGrozor/2, arcoLongitudVisual, arcoGrozor, arcoGrozor/2); 
    gr.generateTexture('wallTex', arcoLongitudVisual, arcoGrozor);
    gr.clear();

    let numWalls = 4; 
    for (let i = 0; i < numWalls; i++) {
        let rad = (Math.PI * 2 / 12) * i; 
        
        let x = config.width / 2 + Math.cos(rad) * radius;
        let y = config.height / 2 + Math.sin(rad) * radius;

        let wall = ringGroup.create(x, y, 'wallTex');
        wall.rotation = rad + Math.PI/2;
        
        wall.body.setSize(arcoLongitudVisual, arcoGrozor);
        wall.setTint(0xFFFFFF);
    }
}
