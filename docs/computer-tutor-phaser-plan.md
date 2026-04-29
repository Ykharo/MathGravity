# Plan final: Tutor Retro con Phaser 3

## Proposito

Crear una funcionalidad independiente llamada provisoriamente `ComputerTutor` o `RetroMathComputer`.

El tutor sera una computadora retro dentro de la nave del jugador. Su objetivo es entregar la respuesta de una multiplicacion mediante una grafica interactiva, para que la jugadora participe y comprenda el procedimiento. No es un examen, no califica, no registra estadisticas y no afecta el juego.

---
**ESTADO DEL PLAN: EJECUTADO E INTEGRADO (ABRIL 2026)**
---

## Rol narrativo

En modo 3, la nave podra activar una computadora de apoyo. Mientras la computadora este abierta, la nave entra en modo camuflaje. La narrativa justifica que el jugador pueda consultar la ayuda sin recibir dano ni alterar el flujo arcade.

Reglas narrativas:

- La computadora es una ayuda de la nave, no una prueba.
- El jugador consulta una multiplicacion y la computadora muestra una explicacion visual.
- La participacion se logra tocando columnas, filas o elementos interactivos.
- Al cerrar la computadora, el jugador vuelve al modo 3.

## Principios de arquitectura

1. El tutor puede usar Phaser 3.
2. El tutor no debe vivir dentro de `game.js`.
3. La logica matematica debe ser pura y testeable.
4. La escena Phaser del tutor debe poder ejecutarse sola en un laboratorio.
5. La integracion con MathGravity debe ser minima y tardia.
6. Se acepta duplicacion transitoria si reduce el riesgo sobre `game.js`.
7. No se deben modificar los modos 1 y 2.
8. No se debe usar `mathProgress.js` para esta funcionalidad.
9. No se deben registrar estadisticas del tutor.
10. No se debe afectar score, vida, enemigos, monedas, armas ni progresion.

## Ubicacion dentro del proyecto

El tutor debe residir dentro del mismo repositorio de MathGravity, no como un proyecto externo separado.

Definicion aprobada:

```text
Mismo repositorio, modulo independiente.
```

Esto significa:

- El codigo vive dentro de `MathGravity/`.
- El laboratorio vive en `labs/computer-tutor/`.
- La logica pura vive en `src/core/computerTutor/`.
- La escena y componentes Phaser viven en `src/phaser/computerTutor/`.
- Las pruebas viven en `tests/computerTutor/`.
- El tutor puede usar Phaser 3 y assets disponibles en el proyecto.
- El tutor no debe depender de variables internas de `game.js`.
- El tutor no debe implementarse como un nuevo proyecto fuera del repo.
- El tutor no debe incrustarse directamente en `game.js`.

La razon de esta decision es facilitar la integracion futura con modo 3, mantener versionado el trabajo junto al juego, reutilizar el ecosistema Phaser ya disponible y, al mismo tiempo, proteger `game.js` mediante aislamiento modular.

## Estructura recomendada

```text
MathGravity/
assets/
  images/
    computerTutor/
      cockpit-bg.png
      crt-frame.png
      computer-button.png
      grid-cell.png
      grid-cell-active.png
      grid-cell-removed.png
      draggable-zero.png
      camouflage-badge.png
  audio/
    computerTutor/
      tutor-open.mp3
      tutor-close.mp3
      tutor-step.mp3
      tutor-complete.mp3
      tutor-error.mp3

src/
  core/
    computerTutor/
      multiplicationParser.js
      tableDiscriminator.js
      areaModelCalculator.js

  phaser/
    computerTutor/
      ComputerTutorScene.js
      ComputerTutorBoot.js
      components/
        RetroComputerFrame.js
        RetroGrid.js
        TutorInputPanel.js
        TutorFormulaPanel.js
      mechanics/
        Group1TwoMechanic.js
        Group1FiveMechanic.js
        Group1TenMechanic.js
        Group2NineMechanic.js
        Group3AreaMechanic.js
      utils/
        tutorTheme.js
        tutorAudio.js

labs/
  computer-tutor/
    index.html
    lab-main.js

tests/
  computerTutor/
    multiplicationParser.test.js
    tableDiscriminator.test.js
    areaModelCalculator.test.js
```

## Requerimientos de interfaz y assets

Como el tutor se implementara con Phaser 3, la interfaz debe aprovechar las utilidades del motor: escenas, contenedores, tweens, sprites, hit areas, audio y efectos visuales. La funcionalidad sigue siendo independiente de `game.js`, pero no debe renunciar a una experiencia visual rica.

### Estilo visual esperado

La computadora debe sentirse parte de la nave de MathGravity:

- estetica retro-futurista;
- pantalla tipo CRT;
- marco de computadora o consola espacial;
- brillo neon moderado;
- scanlines o parpadeo sutil;
- botones grandes aptos para mouse y touch;
- grillas claras de celdas `1 x 1`;
- feedback visual al tocar columnas, filas o elementos arrastrables;
- textos cortos, grandes y legibles en iPad.

No debe sentirse como formulario web externo. Aunque viva en laboratorio, debe verse como una herramienta de la nave.

### Assets recomendados

Carpeta sugerida:

```text
assets/images/computerTutor/
assets/audio/computerTutor/
```

Imagenes sugeridas:

```text
cockpit-bg.png
crt-frame.png
computer-button.png
grid-cell.png
grid-cell-active.png
grid-cell-removed.png
draggable-zero.png
camouflage-badge.png
```

Audio sugerido:

```text
tutor-open.mp3
tutor-close.mp3
tutor-step.mp3
tutor-complete.mp3
tutor-error.mp3
```

Los nombres pueden cambiar si el proyecto ya trae otros assets equivalentes, pero la AI desarrolladora debe mantener un inventario claro de que asset usa cada componente.

### Politica de fallback

La falta de assets finales no debe bloquear el desarrollo.

Orden recomendado:

1. Usar assets finales si ya existen.
2. Usar assets temporales ubicados en `assets/images/computerTutor/`.
3. Usar primitivas de Phaser (`Graphics`, `Rectangle`, `Text`, `Container`) como placeholder.

Los placeholders deben quedar documentados en `docs/ai-development-notes.md` o en la memoria del sprint para reemplazo posterior.

### Carga de assets

La carga debe vivir en el modulo del tutor, no en `game.js`.

Archivo sugerido:

```text
src/phaser/computerTutor/ComputerTutorBoot.js
```

Responsabilidades:

- precargar imagenes del tutor;
- precargar audio del tutor;
- definir keys estables para Phaser;
- lanzar `ComputerTutorScene`.

Ejemplo conceptual de keys:

```text
computerTutor.cockpitBg
computerTutor.crtFrame
computerTutor.gridCell
computerTutor.gridCellActive
computerTutor.zero
computerTutor.openSound
computerTutor.stepSound
```

### Requerimientos especificos de UI

La primera version funcional debe incluir:

- fondo o marco de cabina/computadora;
- pantalla CRT central;
- campo visual para escribir o mostrar la multiplicacion consultada;
- boton de consultar;
- boton de cerrar;
- area de grafica interactiva;
- panel de formula/respuesta;
- mensaje de error para operacion invalida;
- estado visual de ejercicio explicado/completado.

La integracion final en modo 3 debe incluir:

- boton o icono de computadora visible solo en modo 3;
- indicador visual de modo camuflaje mientras el tutor este abierto;
- overlay o contenedor del tutor por encima del juego;
- cierre claro para volver al juego.

## Laboratorio independiente

El laboratorio debe estar dentro de MathGravity y permitir desarrollar y probar el tutor sin abrir el juego principal.

Ruta recomendada:

```text
labs/computer-tutor/index.html
```

Debe cargar Phaser 3 y lanzar solo la escena del tutor. No debe depender de variables globales de `game.js`.

## Contrato del tutor

La escena del tutor debe recibir una configuracion pequena:

```js
{
  initialOperation: "8x7",
  onClose: function () {}
}
```

No debe recibir ni usar:

```text
player
score
lives
enemies
answerCoins
satelliteAnswerGroup
MathProgress
```

## Logica pura

### `multiplicationParser.js`

Responsabilidad: convertir texto a una operacion normalizada.

Debe aceptar:

```text
8x7
8 x 7
8*7
8 × 7
```

Salida esperada:

```js
{ left: 8, right: 7 }
```

Debe rechazar entradas invalidas con error controlado.

### `tableDiscriminator.js`

Responsabilidad: decidir la estrategia educativa.

Reglas:

- Si un factor es `10`: `group1-ten-shift`.
- Si un factor es `5`: `group1-five-skip`.
- Si un factor es `2`: `group1-double`.
- Si un factor es `9`: `group2-nine-subtract`.
- Si los factores pertenecen a tablas 3, 4, 6, 7 u 8: `group3-area-decomposition`.

Prioridad recomendada:

```text
10 > 5 > 2 > 9 > grupo 3
```

Esto evita ambiguedades como `10x2`, `5x9` o `2x9`.

### `areaModelCalculator.js`

Responsabilidad: entregar datos para que Phaser dibuje.

Ejemplo para `8x7`:

```js
{
  strategy: "group3-area-decomposition",
  blocks: [
    { rows: 8, columns: 5, value: 40 },
    { rows: 8, columns: 2, value: 16 }
  ],
  answer: 56,
  formula: "(8 x 5) + (8 x 2) = 40 + 16 = 56"
}
```

Ejemplo para `9x7`:

```js
{
  strategy: "group2-nine-subtract",
  base: { rows: 10, columns: 7, value: 70 },
  removed: { rows: 1, columns: 7, value: 7 },
  answer: 63,
  formula: "(10 x 7) - (1 x 7) = 70 - 7 = 63"
}
```

## Componentes Phaser

### `ComputerTutorScene.js`

Responsabilidad: orquestar la experiencia del tutor.

Debe:

- mostrar marco retro de computadora;
- recibir o pedir una multiplicacion;
- usar los modulos puros para calcular la estrategia;
- delegar la visualizacion a la mecanica correspondiente;
- permitir cerrar la computadora.

No debe:

- calcular matematicas directamente;
- tocar variables del juego principal;
- registrar estadisticas;
- modificar score, vida, enemigos o monedas.

### `RetroGrid.js`

Responsabilidad: dibujar y manejar grillas interactivas.

Debe soportar:

- filas y columnas;
- pintar columna completa;
- pintar fila completa;
- marcar fila removida;
- hit areas amplias para iPad;
- evitar doble activacion visual de la misma columna o fila.

### Mecanicas por grupo

Cada grupo debe vivir en un archivo separado.

```text
Group1TwoMechanic.js
Group1FiveMechanic.js
Group1TenMechanic.js
Group2NineMechanic.js
Group3AreaMechanic.js
```

Cada mecanica recibe datos ya calculados y solo se encarga de visualizacion e interaccion.

## Integracion futura con modo 3

La integracion se realizara al final, cuando el laboratorio ya funcione.

Comportamiento esperado:

1. En modo 3 aparece un boton o icono de computadora.
2. Al activarlo, la nave entra en modo camuflaje.
3. Se abre el tutor como overlay o contenedor Phaser independiente.
4. Mientras el tutor esta abierto, el jugador no recibe dano.
5. Al cerrar, se desactiva el camuflaje y el juego continua.

La integracion deseada en `game.js` debe ser minima:

```js
openComputerTutor();
closeComputerTutor();
```

## Validaciones obligatorias

Durante desarrollo aislado:

```bash
node --check src/core/computerTutor/multiplicationParser.js
node --check src/core/computerTutor/tableDiscriminator.js
node --check src/core/computerTutor/areaModelCalculator.js
node tests/computerTutor/multiplicationParser.test.js
node tests/computerTutor/tableDiscriminator.test.js
node tests/computerTutor/areaModelCalculator.test.js
git diff --check
```

Durante integracion con MathGravity:

```bash
node --check game.js
git diff --check
```

Pruebas manuales:

- El laboratorio abre sin cargar el juego principal.
- `8x7` muestra descomposicion de area y respuesta `56`.
- `9x7` muestra resta desde base 10 y respuesta `63`.
- `5x6` muestra conteo `5, 10, 15, 20, 25, 30`.
- `2x8` muestra doble de 8.
- `10x4` muestra estrategia de agregar cero.
- Modo 1 no muestra el tutor.
- Modo 2 no muestra el tutor.
- Modo 3 muestra boton de computadora.
- Abrir/cerrar tutor no cambia score, vida ni estado educativo.
