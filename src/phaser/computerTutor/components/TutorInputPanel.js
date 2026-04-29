export default class TutorInputPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height) {
        super(scene, x, y);
        this.panelWidth = width;
        this.panelHeight = height;

        this.createPanel();
        scene.add.existing(this);
    }

    createPanel() {
        const graphics = this.scene.add.graphics();
        
        // Fondo panel
        graphics.fillStyle(0x111111, 0.8);
        graphics.fillRoundedRect(0, 0, this.panelWidth, this.panelHeight, 5);
        graphics.lineStyle(2, 0x00ff00, 0.5);
        graphics.strokeRoundedRect(0, 0, this.panelWidth, this.panelHeight, 5);

        this.add(graphics);

        // Texto "OPERACIÓN"
        this.add(this.scene.add.text(10, 5, 'OPERACIÓN:', {
            font: '14px monospace',
            fill: '#00ff00'
        }));

        // Fondo clicable para el texto (Área táctil ampliada)
        const textBg = this.scene.add.rectangle(this.panelWidth / 2, this.panelHeight / 2, 250, 60, 0x00ff00, 0.05)
            .setInteractive({ useHandCursor: true });
        this.add(textBg);

        this.displayText = this.scene.add.text(this.panelWidth / 2, this.panelHeight / 2, '5 x 6', {
            font: '32px monospace',
            fill: '#00ff00',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        this.add(this.displayText);

        // Cursor parpadeante
        this.cursor = this.scene.add.text(0, 0, '_', { font: '32px monospace', fill: '#00ff00' }).setVisible(false);
        this.add(this.cursor);

        // Input oculto para móviles/iPad (necesario para disparar el teclado)
        this.hiddenInput = document.createElement('input');
        this.hiddenInput.type = 'text';
        this.hiddenInput.style.position = 'absolute';
        this.hiddenInput.style.opacity = '0';
        this.hiddenInput.style.pointerEvents = 'none';
        this.hiddenInput.style.zIndex = '-1';
        document.body.appendChild(this.hiddenInput);

        this.isEditing = false;

        const startEditing = () => {
            this.isEditing = true;
            this.hiddenInput.value = this.displayText.text;
            this.hiddenInput.focus();
            this.displayText.setAlpha(0.5);
            this.cursor.setVisible(true);
            this.updateCursorPosition();
        };

        const stopEditing = () => {
            this.isEditing = false;
            this.displayText.setAlpha(1);
            this.cursor.setVisible(false);
            this.hiddenInput.blur();
            if (this.hiddenInput.value.trim() !== "") {
                this.emit('consult', this.hiddenInput.value);
            }
        };

        textBg.on('pointerdown', startEditing);

        // Listener de teclado para Phaser
        this.scene.input.keyboard.on('keydown', (event) => {
            if (!this.isEditing) return;

            if (event.key === 'Enter') {
                stopEditing();
            } else if (event.key === 'Escape') {
                this.isEditing = false;
                this.displayText.setAlpha(1);
                this.cursor.setVisible(false);
            }
        });

        // Sincronizar input oculto con Phaser
        this.hiddenInput.oninput = () => {
            if (this.isEditing) {
                this.displayText.setText(this.hiddenInput.value.toUpperCase());
                this.updateCursorPosition();
            }
        };

        this.hiddenInput.onblur = () => {
            if (this.isEditing) stopEditing();
        };

        // Texto de ayuda pequeño
        this.add(this.scene.add.text(this.panelWidth / 2, this.panelHeight / 2 + 25, '(TOQUE PARA EDITAR)', {
            font: '10px monospace',
            fill: '#00ff00',
            alpha: 0.6
        }).setOrigin(0.5));

        // Boton Consultar / Reiniciar
        const btn = this.scene.add.container(this.panelWidth - 80, this.panelHeight / 2);
        
        const btnBg = this.scene.add.rectangle(0, 0, 100, 50, 0x004400)
            .setInteractive({ useHandCursor: true });
        
        const btnText = this.scene.add.text(0, 0, 'RUN', {
            font: '18px monospace',
            fill: '#00ff00',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        btn.add([btnBg, btnText]);
        this.add(btn);

        btnBg.on('pointerdown', () => {
            if (this.isEditing) stopEditing();
            this.emit('consult', this.displayText.text);
        });
    }

    updateCursorPosition() {
        const textWidth = this.displayText.width;
        this.cursor.x = (this.panelWidth / 2) + (textWidth / 2) + 5;
        this.cursor.y = this.panelHeight / 2;
        this.cursor.setOrigin(0, 0.5);
    }

    setOperation(text) {
        this.displayText.setText(text);
        if (this.isEditing) this.updateCursorPosition();
    }
}
