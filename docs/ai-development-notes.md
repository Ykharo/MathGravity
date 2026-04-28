# Math Gravity: notas para continuar con AI

## Estado actual

Math Gravity es un juego educativo arcade construido con Phaser 3. El archivo principal sigue siendo `game.js`, que todavia concentra escena, fisicas, audio, UI, enemigos, armas y reglas del juego.

El objetivo de la modularizacion no es reescribir todo de una vez, sino extraer piezas pequenas y testeables sin romper el juego que ya funciona.

## Funcionalidad agregada en esta iteracion

Se agrego una via rapida por voz para el modo 3, `Supervivencia Total`.

Flujo:

1. El jugador choca un bloque de multiplicacion.
2. Se generan las monedas/respuestas como antes.
3. Solo en modo 3, el bloque activo muestra `MIC`.
4. Si el jugador mantiene presionado el bloque y dice la respuesta correcta, la nave viaja a velocidad luz hacia la moneda correcta.
5. La recompensa no se calcula en el sistema de voz. El viaje termina chocando la moneda correcta y se reutiliza `hitAnswerCoin`.
6. Despues del viaje, la nave queda congelada y un sonar permanece parpadeando hasta que el cursor se acerca para rescatarla.

Reglas importantes:

- No activar microfono ni viaje luminico en modos 1 y 2.
- No duplicar score, vida, enemigos ni progresion fuera de `hitAnswerCoin`.
- Si la respuesta vocal es incorrecta, mostrar y decir `Incorrecto`.
- Si el navegador no soporta o falla con reconocimiento de voz, mostrar y decir `Problema tecnico, intente mas tarde...` y reproducir sonido de colgado.

## Archivos relevantes

- `src/core/mathSpeech.js`: modulo puro para normalizar texto hablado, convertir numeros en espanol y comparar contra la respuesta esperada.
- `game.js`: integracion con Phaser, reconocimiento de voz, efectos visuales, congelamiento de nave y sonar.
- `index.html`: carga `src/core/mathSpeech.js` antes de `game.js`.
- `tests/mathSpeech.test.js`: pruebas permanentes para la logica pura de voz matematica.

## Estrategia de modularizacion

La regla usada fue separar lo que no depende de Phaser:

- Logica pura: `src/core/mathSpeech.js`.
- Efectos y escena: `game.js`.

Esto permite probar la interpretacion de respuestas sin abrir navegador, sin microfono y sin Phaser.

## Validaciones usadas

Comandos recomendados:

```bash
node --check game.js
node --check src/core/mathSpeech.js
node tests/mathSpeech.test.js
git diff --check
```

Que verifica cada uno:

- `node --check`: sintaxis JavaScript.
- `node tests/mathSpeech.test.js`: casos reales de respuestas habladas.
- `git diff --check`: whitespace problematico o conflictos de merge en el diff.

## Prueba manual en navegador

Levantar servidor local:

```bash
python3 -m http.server 4173
```

Abrir:

```text
http://localhost:4173/
```

Lista de prueba:

- Modo 1: no aparece `MIC`.
- Modo 2: no aparece `MIC`.
- Modo 3: aparece `MIC` en el bloque activo despues de seleccionar una multiplicacion.
- Respuesta correcta por voz: viaje luminico a la moneda correcta, luego recompensa normal.
- Respuesta incorrecta por voz: texto y voz `Incorrecto`.
- Problema tecnico de voz: texto y voz `Problema tecnico, intente mas tarde...`.
- Despues del viaje: sonar sigue parpadeando hasta acercar el cursor a la nave.

## Reglas para futuras sesiones de AI

- Hacer cambios pequenos y verificables.
- Preferir extraer logica pura antes que mover codigo visual.
- No reescribir `game.js` completo en una sola pasada.
- No tocar `.DS_Store`.
- No modificar modos 1 y 2 al agregar ayudas arcade del modo 3.
- Mantener el juego jugable despues de cada cambio.
- Si se agrega una regla educativa, crear prueba permanente cuando sea posible.

## Siguiente paso sugerido

Antes de la segunda funcionalidad grande, abrir un nuevo chat y entregar este archivo como contexto. La segunda funcionalidad deberia seguir el mismo patron: especificacion concreta, modulo pequeno si hay logica pura, integracion minima en `game.js`, pruebas y verificacion manual.
