# Planificacion de implementacion: Tutor Retro

## Estrategia general

El tutor se desarrollara dentro del repositorio MathGravity, pero fuera del juego principal. Usara Phaser 3 en un laboratorio independiente ubicado en `labs/computer-tutor/`. La integracion con modo 3 se hara solo cuando el tutor funcione y haya sido probado manualmente.

Definicion aprobada:

```text
Mismo repositorio, modulo independiente.
```

Implicancias:

- No crear un proyecto externo fuera de MathGravity.
- No implementar el tutor dentro de `game.js`.
- Mantener el laboratorio en `labs/computer-tutor/`.
- Mantener la logica matematica en `src/core/computerTutor/`.
- Mantener la visualizacion Phaser en `src/phaser/computerTutor/`.
- Mantener las pruebas en `tests/computerTutor/`.
- Se permite duplicacion transitoria para proteger `game.js`.

La unidad de trabajo recomendada es un sprint pequeño. Cada sprint debe modificar pocos archivos, tener una validación clara y actualizar la memoria documental cuando cambie una decisión importante.

---
**ESTADO DEL PROYECTO: FINALIZADO E INTEGRADO (ABRIL 2026)**
---

## Fase 0: Preparacion documental y laboratorio

### Sprint 0.1: Documentacion base [COMPLETADO]

Objetivo: dejar claras las reglas antes de programar.

Tareas:

- Crear o revisar `docs/computer-tutor-phaser-plan.md`.
- Crear o revisar `docs/computer-tutor-ai-prompt.md`.
- Crear o revisar `docs/computer-tutor-implementation-plan.md`.
- Agregar una nota breve a `docs/ai-development-notes.md` indicando que el tutor vivira dentro de MathGravity como modulo independiente, sin estadisticas y sin tocar `game.js` hasta la fase de integracion.

Validacion:

```bash
git diff --check
```

### Sprint 0.2: Laboratorio Phaser independiente [COMPLETADO]

Objetivo: ejecutar una escena Phaser del tutor sin cargar `game.js`.

Tareas:

- Crear `labs/computer-tutor/index.html`.
- Crear `labs/computer-tutor/lab-main.js`.
- Crear escena base en `src/phaser/computerTutor/ComputerTutorScene.js`.
- Crear boot/preload basico en `src/phaser/computerTutor/ComputerTutorBoot.js` si el laboratorio necesita cargar assets.
- Mostrar una pantalla simple con texto de prueba y boton cerrar falso.

Validacion:

```bash
node --check labs/computer-tutor/lab-main.js
node --check src/phaser/computerTutor/ComputerTutorBoot.js
node --check src/phaser/computerTutor/ComputerTutorScene.js
git diff --check
```

Prueba manual:

- Levantar servidor local.
- Abrir `http://localhost:4173/labs/computer-tutor/`.
- Confirmar que aparece la escena del tutor.

### Sprint 0.3: Inventario y placeholders de assets [COMPLETADO]

Objetivo: preparar la base visual sin depender de assets finales.

Tareas:

- Revisar assets existentes en `assets/images/` y `assets/audio/`.
- Crear carpetas si son necesarias:

```text
assets/images/computerTutor/
assets/audio/computerTutor/
```

- Definir lista de assets finales esperados.
- Si aun no existen imagenes finales, usar placeholders con Phaser `Graphics`.
- Documentar en memoria del sprint que assets son finales y cuales son temporales.

Assets sugeridos:

```text
assets/images/computerTutor/cockpit-bg.png
assets/images/computerTutor/crt-frame.png
assets/images/computerTutor/computer-button.png
assets/images/computerTutor/grid-cell.png
assets/images/computerTutor/grid-cell-active.png
assets/images/computerTutor/grid-cell-removed.png
assets/images/computerTutor/draggable-zero.png
assets/images/computerTutor/camouflage-badge.png
assets/audio/computerTutor/tutor-open.mp3
assets/audio/computerTutor/tutor-close.mp3
assets/audio/computerTutor/tutor-step.mp3
assets/audio/computerTutor/tutor-complete.mp3
assets/audio/computerTutor/tutor-error.mp3
```

Validacion:

```bash
git diff --check
```

Nota: no se debe bloquear la implementacion por falta de assets finales. Los placeholders estan permitidos mientras queden documentados.

## Fase 1: Logica pura

### Sprint 1.1: Parser de multiplicaciones [COMPLETADO]

Objetivo: transformar texto en una operacion normalizada.

Archivos:

```text
src/core/computerTutor/multiplicationParser.js
tests/computerTutor/multiplicationParser.test.js
```

Casos:

- `8x7`
- `8 x 7`
- `8*7`
- `8 × 7`
- entradas invalidas

Validacion:

```bash
node --check src/core/computerTutor/multiplicationParser.js
node tests/computerTutor/multiplicationParser.test.js
git diff --check
```

### Sprint 1.2: Discriminador de estrategias [COMPLETADO]

Objetivo: asignar cada multiplicacion a una estrategia visual.

Archivos:

```text
src/core/computerTutor/tableDiscriminator.js
tests/computerTutor/tableDiscriminator.test.js
```

Casos:

- `10x4`: grupo 1, agregar cero.
- `5x6`: grupo 1, conteo de cinco.
- `2x8`: grupo 1, doble.
- `9x7`: grupo 2, resta desde diez.
- `8x7`: grupo 3, descomposicion de area.

Validacion:

```bash
node --check src/core/computerTutor/tableDiscriminator.js
node tests/computerTutor/tableDiscriminator.test.js
git diff --check
```

### Sprint 1.3: Calculadora de modelos de area [COMPLETADO]

Objetivo: entregar datos listos para renderizar.

Archivos:

```text
src/core/computerTutor/areaModelCalculator.js
tests/computerTutor/areaModelCalculator.test.js
```

Casos:

- `8x7` genera `8x5 + 8x2`.
- `9x7` genera `10x7 - 1x7`.
- `5x6` genera secuencia acumulada.
- `2x8` genera doble.
- `10x4` genera desplazamiento/agregar cero.

Validacion:

```bash
node --check src/core/computerTutor/areaModelCalculator.js
node tests/computerTutor/areaModelCalculator.test.js
git diff --check
```

## Fase 2: Componentes Phaser del tutor

### Sprint 2.1: Marco retro y paneles [COMPLETADO]

Objetivo: construir la base visual de la computadora.

Archivos esperados:

```text
src/phaser/computerTutor/components/RetroComputerFrame.js
src/phaser/computerTutor/components/TutorInputPanel.js
src/phaser/computerTutor/components/TutorFormulaPanel.js
```

Validacion:

```bash
node --check src/phaser/computerTutor/components/RetroComputerFrame.js
node --check src/phaser/computerTutor/components/TutorInputPanel.js
node --check src/phaser/computerTutor/components/TutorFormulaPanel.js
git diff --check
```

Prueba manual:

- El laboratorio muestra una computadora retro legible.
- La pantalla se siente como una consola/CRT de nave, no como un formulario externo.
- El input permite consultar una operacion.
- Los botones son grandes y claros para mouse/touch.
- Una operacion invalida muestra error amable.

### Sprint 2.2: Componente `RetroGrid` [COMPLETADO]

Objetivo: dibujar grillas interactivas reutilizables.

Archivo:

```text
src/phaser/computerTutor/components/RetroGrid.js
```

Debe soportar:

- pintar columna;
- pintar fila;
- remover fila visualmente;
- hit areas tactiles amplias;
- evitar doble activacion visual.

Validacion:

```bash
node --check src/phaser/computerTutor/components/RetroGrid.js
git diff --check
```

Prueba manual:

- Tocar una columna la pinta completa.
- Tocar dos veces la misma columna no duplica la accion.
- Funciona con mouse y touch.

## Fase 3: Mecanicas educativas

### Sprint 3.1: Grupo 3, descomposicion de area [COMPLETADO]

Archivo:

```text
src/phaser/computerTutor/mechanics/Group3AreaMechanic.js
```

Caso inicial obligatorio:

```text
8x7 = (8x5) + (8x2) = 56
```

Validacion manual:

- Se muestran dos bloques.
- La jugadora toca columnas.
- El acumulado avanza.
- La respuesta final aparece al completar la interaccion.

### Sprint 3.2: Grupo 2, tabla del 9 [COMPLETADO]

Archivo:

```text
src/phaser/computerTutor/mechanics/Group2NineMechanic.js
```

Caso inicial:

```text
9x7 = (10x7) - (1x7) = 63
```

### Sprint 3.3: Grupo 1, tabla del 5 [COMPLETADO]

Archivo:

```text
src/phaser/computerTutor/mechanics/Group1FiveMechanic.js
```

Caso inicial:

```text
5x6 = 5, 10, 15, 20, 25, 30
```

### Sprint 3.4: Grupo 1, tabla del 2 [COMPLETADO]

Archivo:

```text
src/phaser/computerTutor/mechanics/Group1TwoMechanic.js
```

Caso inicial:

```text
2x8 = doble de 8 = 16
```

### Sprint 3.5: Grupo 1, tabla del 10 [COMPLETADO]

Archivo:

```text
src/phaser/computerTutor/mechanics/Group1TenMechanic.js
```

Caso inicial:

```text
10x4 = 40
```

## Fase 4: Pulido de experiencia

### Sprint 4.1: Audio y feedback [COMPLETADO]

Objetivo: agregar sonidos simples sin crear sistema complejo.

Debe incluir:

- avance;
- error;
- cierre;
- finalizacion.

Los sonidos deben cargarse desde el modulo del tutor. Si no existen sonidos finales en `assets/audio/computerTutor/`, se pueden reutilizar temporalmente sonidos existentes de `assets/audio/`, dejando la deuda documentada.

### Sprint 4.2: Ajuste tactil/iPad [COMPLETADO]

Objetivo: que el tutor sea comodo para tocar.

Validar:

- botones grandes;
- hit areas amplias;
- textos legibles;
- grillas dentro de pantalla;
- sin depender solo del teclado.

Validar tambien:

- los assets no se ven borrosos o deformados;
- la pantalla CRT no oculta la grilla ni la formula;
- el texto no se sale de botones o paneles;
- el overlay del tutor mantiene una proporcion razonable en desktop e iPad.

### Sprint 4.3: Estados de uso [COMPLETADO]

Objetivo: cerrar bordes de UX.

Estados:

- operacion vacia;
- operacion invalida;
- operacion fuera de rango;
- explicacion lista;
- nueva consulta;
- cerrar tutor.

### Sprint 4.4: Refinamiento Pedagógico y Visual Final [COMPLETADO]

Objetivo: unificar la experiencia visual y asegurar precisión pedagógica.

Logros:
- **Rotación Estratégica (G3)**: `7x3` -> `3x7` para forzar referencia de 5 columnas.
- **Estandarización de Guías**: Cotas `I---N---I` en todas las mecánicas.
- **Limpieza de Mapas**: Eliminación de redundancias en el álgebra mostrada.
- **Flexibilidad de Entrada**: Soporte para múltiples formatos de texto sin espacios.
- **Corrección de Conteo**: Ajuste del panel lateral para la tabla del 9.
- **Unificación de Color**: Cambio de focos de ayuda a verde neón MG-88.

Validación:
- Pruebas manuales exitosas en `7x3`, `8x7`, `9x7`, `7x5` y `10x4`.

## Fase 5: Integracion minima con modo 3

Esta fase solo empieza cuando el laboratorio esta estable.

### Sprint 5.1: Boton de computadora solo en modo 3 [COMPLETADO]

Objetivo: mostrar una forma de abrir el tutor solo en modo 3.

Reglas:

- modo 1: no aparece;
- modo 2: no aparece;
- modo 3: aparece;
- no cambia score, vida, enemigos ni monedas.

### Sprint 5.2: Modo camuflaje [COMPLETADO]

Objetivo: proteger narrativamente la nave mientras se usa el tutor.

Al abrir:

- activar estado visual de camuflaje;
- evitar dano mientras el tutor esta abierto;
- abrir overlay del tutor.
- mostrar indicador visual de camuflaje, idealmente usando `assets/images/computerTutor/camouflage-badge.png` o placeholder Phaser.

Al cerrar:

- ocultar overlay;
- quitar camuflaje;
- reanudar juego.

### Sprint 5.3: Overlay del tutor [COMPLETADO]

Objetivo: montar el tutor sin mezclarlo en `game.js`.

Opciones:

- contenedor HTML con un segundo Phaser.Game;
- overlay interno que carga la escena independiente;
- iframe local si resulta mas seguro.

Elegir la opcion con menor riesgo sobre `game.js`.

## Buenas practicas de documentacion

### `docs/ai-development-notes.md`

Actualizar este archivo cuando:

- se toma una decision arquitectonica;
- se agrega una regla permanente;
- se descubre una fragilidad;
- se cambia la estrategia de integracion;
- se termina una fase relevante.

No usarlo para bitacora excesiva de cada linea modificada. Debe servir para que otra AI entienda el estado del proyecto.

Formato recomendado:

```text
### Tutor Retro / ComputerTutor

- Fecha:
- Decision:
- Archivos relevantes:
- Validaciones:
- Riesgos pendientes:
```

### Documento de memoria por sprint

Al final de cada sprint, pedir a la AI que entregue un resumen copiablo:

```text
Memoria para siguiente chat:
- Sprint completado:
- Archivos creados/modificados:
- Decisiones tomadas:
- Validaciones ejecutadas:
- Pendientes:
- No tocar:
```

Ese bloque puede pegarse en el siguiente chat si no se quiere actualizar documentacion formal cada vez.

### Fuente de verdad

Orden de prioridad cuando haya contradicciones:

1. Instruccion humana mas reciente.
2. `docs/computer-tutor-phaser-plan.md`.
3. `docs/computer-tutor-implementation-plan.md`.
4. `docs/ai-development-notes.md`.
5. Requerimiento original como contexto historico.

### Manejo entre chats con AI

Al iniciar un nuevo chat, entregar siempre:

1. El prompt de `docs/computer-tutor-ai-prompt.md`.
2. El sprint especifico a ejecutar.
3. La memoria del sprint anterior si existe.

No entregar un backlog completo como orden de ejecucion. Una AI media funciona mejor con una tarea chica, archivos concretos y validaciones claras.

## Requerimiento original

El requerimiento original puede entregarse como material de contexto, pero no como instruccion principal.

Recomendacion:

- Entregarlo solo en el primer chat o cuando se este revisando diseño educativo.
- Indicar que el plan final reemplaza cualquier instruccion conflictiva.
- No pedir a la AI que "implemente el requerimiento completo".

Frase sugerida:

```text
Adjunto el requerimiento original solo como referencia pedagogica y narrativa. No lo ejecutes literalmente. En caso de conflicto, obedece docs/computer-tutor-phaser-plan.md y el sprint actual.
```
