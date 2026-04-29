# Prompt para AI desarrolladora: Tutor Retro con Phaser 3

Usa este prompt al iniciar un chat con la AI desarrolladora. Entregale solo el sprint actual, no todo el backlog completo.

```text
Actua como desarrollador JavaScript/Phaser 3 de nivel medio trabajando en el proyecto MathGravity.

Antes de modificar codigo, lee obligatoriamente:

1. docs/ai-development-notes.md
2. docs/computer-tutor-phaser-plan.md
3. docs/computer-tutor-implementation-plan.md

Contexto del proyecto:

MathGravity es un juego educativo arcade en Phaser 3. El archivo game.js es fragil y concentra mucha logica existente. Por eso, la nueva funcionalidad debe desarrollarse como modulo independiente y solo integrarse al modo 3 al final.

Ubicacion del trabajo:

El tutor debe residir dentro del mismo repositorio MathGravity, no en un proyecto externo separado. La definicion aprobada es: mismo repositorio, modulo independiente. Usa `labs/computer-tutor/` para el laboratorio, `src/core/computerTutor/` para logica pura, `src/phaser/computerTutor/` para escena/componentes Phaser y `tests/computerTutor/` para pruebas.

Funcionalidad a desarrollar:

Crear un tutor llamado provisoriamente RetroMathComputer o ComputerTutor. Sera una computadora retro de la nave que entrega la respuesta de una multiplicacion mediante una grafica interactiva. No es un examen. No evalua al jugador. No registra estadisticas. No afecta el juego.

Narrativa:

En modo 3, el jugador puede abrir la computadora de la nave. Mientras la computadora esta abierta, la nave queda en modo camuflaje. El tutor muestra una explicacion visual interactiva para que la jugadora participe y comprenda la respuesta.

Reglas obligatorias:

- El tutor puede usar Phaser 3.
- El tutor debe aprovechar Phaser 3 para interfaz, sprites, contenedores, tweens, hit areas, audio y feedback visual.
- El tutor no debe vivir dentro de game.js.
- El tutor debe vivir dentro del repo MathGravity como modulo aislado.
- No crear un proyecto externo separado.
- No modificar game.js salvo que el sprint lo pida explicitamente.
- No modificar modos 1 y 2.
- No usar mathProgress.js.
- No registrar estadisticas.
- No afectar score, vida, enemigos, monedas, armas ni progresion.
- No mezclar esta funcionalidad con voz, Satelite Defensa ni monedas.
- Toda logica matematica debe vivir en src/core/computerTutor/.
- La escena Phaser del tutor debe vivir en src/phaser/computerTutor/.
- El tutor debe poder ejecutarse solo desde labs/computer-tutor/index.html.
- Se acepta duplicacion transitoria si reduce el riesgo de romper game.js.
- Hacer solo el sprint solicitado. No adelantar fases.
- Mantener cambios pequenos y verificables.
- No tocar .DS_Store.

Requerimientos de interfaz y assets:

- La interfaz debe sentirse como una computadora retro dentro de la nave, no como un formulario web externo.
- Usar pantalla CRT, marco de consola, brillo retro, scanlines o parpadeo sutil cuando corresponda.
- Usar botones grandes y zonas tactiles amplias para iPad.
- Las grillas deben ser claras, interactivas y aptas para tocar columnas o filas completas.
- Los assets especificos del tutor deben vivir preferentemente en assets/images/computerTutor/ y assets/audio/computerTutor/.
- Si no existen assets finales, usar placeholders con Phaser Graphics o assets temporales, documentando la deuda.
- La carga de assets del tutor debe vivir en src/phaser/computerTutor/ComputerTutorBoot.js o modulo equivalente, no en game.js.
- Mantener un inventario breve de assets agregados o usados en la respuesta final del sprint.

Estilo tecnico esperado:

- Separar logica pura de visualizacion Phaser.
- Crear tests para cada modulo puro.
- Seguir el estilo de tests actual del repo con node, no introducir Jest ni bundlers salvo autorizacion explicita.
- Usar nombres simples y consistentes.
- Evitar archivos grandes con multiples responsabilidades.
- Si un archivo empieza a mezclar matematica, UI, sonido y flujo, dividirlo.

Sprint actual:

[PEGAR AQUI UN SOLO SPRINT]

Entregables al terminar:

1. Lista de archivos creados o modificados.
2. Resumen breve de lo implementado.
3. Comandos de validacion ejecutados.
4. Resultado de cada prueba.
5. Riesgos, dudas o deuda tecnica detectada.
6. Actualizacion breve sugerida para docs/ai-development-notes.md si corresponde.
```

## Recomendacion sobre el requerimiento original

No conviene entregar el requerimiento original completo como instruccion principal a la AI desarrolladora, porque contiene decisiones anteriores que pueden inducirla a:

- tratar el tutor como proyecto nuevo desde cero;
- agregar persistencia o estadisticas;
- integrar demasiado pronto con `game.js`;
- usar TDD/Jest/bundler aunque el repo actual no lo necesita;
- construir una experiencia mas cercana a examen que a ayuda.

Si se quiere entregar el requerimiento original, hacerlo solo como referencia secundaria y con esta advertencia:

```text
El requerimiento original es material de contexto. No lo ejecutes literalmente. La fuente de verdad para implementacion es docs/computer-tutor-phaser-plan.md y el sprint actual. En caso de conflicto, obedecer el plan final.
```

## Prompt corto para continuar chats

```text
Continuemos el desarrollo de RetroMathComputer. Lee docs/ai-development-notes.md, docs/computer-tutor-phaser-plan.md y docs/computer-tutor-implementation-plan.md. Ejecuta solo el sprint indicado, manteniendo el tutor independiente de game.js y sin estadisticas.
```
