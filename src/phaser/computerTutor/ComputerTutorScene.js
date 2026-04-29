import RetroComputerFrame from './components/RetroComputerFrame.js';
import TutorInputPanel from './components/TutorInputPanel.js';
import TutorFormulaPanel from './components/TutorFormulaPanel.js';
import SideProgressPanel from './components/SideProgressPanel.js';
import RetroGrid from './components/RetroGrid.js';
import Group3AreaMechanic from './mechanics/Group3AreaMechanic.js';
import Group2NineMechanic from './mechanics/Group2NineMechanic.js';
import Group1FiveMechanic from './mechanics/Group1FiveMechanic.js';
import Group1TwoMechanic from './mechanics/Group1TwoMechanic.js';
import Group1TenMechanic from './mechanics/Group1TenMechanic.js';

// MultiplicationParser, TableDiscriminator y AreaModelCalculator se cargan via script tag en index.html

export default class ComputerTutorScene extends Phaser.Scene {
    constructor() {
        super('ComputerTutorScene');
        this.currentMechanic = null;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Fondo base
        this.add.rectangle(0, 0, width, height, 0x000500).setOrigin(0);

        // 2. Marco Retro
        this.frame = new RetroComputerFrame(this, 20, 20, width - 40, height - 40);

        // 3. Paneles principales
        this.inputPanel = new TutorInputPanel(this, 100, 60, width - 450, 80);
        this.formulaPanel = new TutorFormulaPanel(this, 100, height - 120, width - 200, 60);

        // Calcular posición alineada con el botón RUN (width - 450 - 80)
        const runButtonX = 100 + (width - 450) - 80;

        // 4. Target Algebra (Mapa) - Desplazado a Y=215 (180 + 35) para evitar solapamiento
        this.targetAlgebraText = this.add.text(runButtonX - 50, 215, '', {
            font: 'bold 16px monospace',
            fill: '#00ff00',
            backgroundColor: '#001100',
            padding: { x: 5, y: 5 }
        });

        // 5. Panel de Progreso Lateral (Debajo del mapa)
        this.sidePanel = new SideProgressPanel(this, runButtonX - 50, 255);

        // 6. Boton Cerrar
        this.createCloseButton(width - 80, 50);

        // 7. Escuchar eventos del panel de entrada
        this.inputPanel.on('consult', (op) => this.runTutor(op));

        // 8. Operación inicial
        this.runTutor('8x7');

        // 9. Efecto de Scanlines
        this.createScanlines(width, height);
    }

    runTutor(operationStr) {
        try {
            console.log(`Tutor: Analizando "${operationStr}"`);
            
            // Lógica Pura (Variables Globales cargadas en index.html)
            const { left, right } = window.MultiplicationParser.parse(operationStr);
            const strategy = window.TableDiscriminator.getStrategy(left, right);
            const data = window.AreaModelCalculator.calculate(left, right, strategy);

            // Actualizar UI
            this.inputPanel.setOperation(`${left} x ${right}`);
            this.targetAlgebraText.setText(`MAPA: ${data.targetFormula || ''}`);
            this.formulaPanel.setFormula(`ANÁLISIS DE ÁREA: 0 / ?`);

            // Limpiar grilla y mecánica anterior
            if (this.grid) this.grid.destroy();
            if (this.currentMechanic) {
                if (this.currentMechanic.destroy) this.currentMechanic.destroy();
                this.currentMechanic = null;
            }

            // Configurar Side Panel para TODAS las estrategias
            this.sidePanel.setVisible(true);
            this.sidePanel.setupBlocks(data.blocks);

            // Crear nueva grilla (Basada en las dimensiones del calculador, que pueden estar rotadas para pedagógia)
            const gridRows = data.rows;
            const gridCols = data.cols;
            this.grid = new RetroGrid(this, 120, 215, gridRows, gridCols, 35);
            
            // Inicializar mecánica específica
            if (strategy === 'group3-area-decomposition') {
                this.currentMechanic = new Group3AreaMechanic(this, this.grid, data);
            } else if (strategy === 'group2-nine-subtract') {
                this.currentMechanic = new Group2NineMechanic(this, this.grid, data);
            } else if (strategy === 'group1-five-skip') {
                this.currentMechanic = new Group1FiveMechanic(this, this.grid, data);
            } else if (strategy === 'group1-double') {
                this.currentMechanic = new Group1TwoMechanic(this, this.grid, data);
            } else if (strategy === 'group1-ten-shift') {
                this.currentMechanic = new Group1TenMechanic(this, this.grid, data);
            }

            // Eventos de la grilla
            this.grid.on('cellUpdate', () => {
                const count = this.grid.getTotalActive();
                
                // Mostrar progreso con incógnita
                if (!this.currentMechanic || !this.currentMechanic.isComplete) {
                    this.formulaPanel.setFormula(`ANÁLISIS DE ÁREA: ${count} / ?`);
                }
                
                if (this.currentMechanic && this.currentMechanic.update) {
                    const wasComplete = this.currentMechanic.isComplete;
                    const blockIdxBeforeUpdate = (this.currentMechanic.currentBlockIndex !== undefined) ? this.currentMechanic.currentBlockIndex : 0;
                    
                    this.currentMechanic.update();
                    
                    // Actualizar Side Panel de forma generica
                    const idx = blockIdxBeforeUpdate;
                    if (data.blocks && data.blocks[idx]) {
                        const block = data.blocks[idx];
                        const startCol = (idx === 0) ? 0 : data.blocks[0].columns;
                        
                        // Calcular progreso del bloque actual
                        let blockCount = 0;
                        for (let r = 0; r < block.rows; r++) {
                            for (let c = startCol; c < startCol + block.columns; c++) {
                                if (this.grid.cells[r][c] && this.grid.cells[r][c].active) blockCount++;
                            }
                        }
                        this.sidePanel.updateProgress(idx, blockCount, block.value);
                    }

                    if (!wasComplete && this.currentMechanic.isComplete) {
                        this.playTutorSound('tutor-success');
                        this.formulaPanel.setFormula(data.formula);
                    }
                }
            });

            // Re-vincular clicks de la grilla a la mecánica con sonido garantizado
            this.grid.on('rowClick', (row) => {
                this.playTutorSound('tutor-step');
                if (this.currentMechanic && this.currentMechanic.onRowClick) {
                    this.currentMechanic.onRowClick(row);
                }
            });

            this.grid.on('columnClick', (col) => {
                this.playTutorSound('tutor-step');
                if (this.currentMechanic && this.currentMechanic.onColumnClick) {
                    this.currentMechanic.onColumnClick(col);
                }
            });

            console.log('Tutor: Estrategia detectada:', strategy);
            
        } catch (error) {
            console.error('Tutor Error:', error);
            this.playTutorSound('tutor-error');
            
            if (this.formulaPanel) {
                this.formulaPanel.setError(`ERR: ${error.message.toUpperCase()}`);
            }

            // Limpiar grilla si hubo error durante la creación
            if (this.grid) {
                this.grid.destroy();
                this.grid = null;
            }
        }
    }

    playTutorSound(key) {
        try {
            this.sound.play(key, { volume: 0.4 });
        } catch (e) {
            console.warn(`Error al reproducir sonido ${key}:`, e);
        }
    }

    createCloseButton(x, y) {
        const btn = this.add.text(x, y, '[ CERRAR ]', {
            font: '16px monospace',
            fill: '#ff0000',
            backgroundColor: '#220000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        // Area tactil ampliada
        const hit = this.add.rectangle(x, y, 120, 50, 0xff0000, 0)
            .setInteractive({ useHandCursor: true });
        
        hit.on('pointerdown', () => this.scene.stop());
        
        // Efecto visual al pasar el mouse
        hit.on('pointerover', () => btn.setTint(0xffaaaa));
        hit.on('pointerout', () => btn.clearTint());
    }

    createScanlines(width, height) {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x000000, 0.1);
        for (let i = 0; i < height; i += 4) {
            graphics.lineBetween(0, i, width, i);
        }
        graphics.setDepth(1000);
    }
}
