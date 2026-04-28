# Math Gravity: notas para continuar con AI

## Estado actual

Math Gravity es un juego educativo arcade construido con Phaser 3. El archivo principal sigue siendo `game.js`, que todavia concentra escena, fisicas, audio, UI, enemigos, armas y reglas del juego.

El objetivo de la modularizacion no es reescribir todo de una vez, sino extraer piezas pequenas y testeables sin romper el juego que ya funciona.

## Funcionalidades agregadas

### 1. Via rapida por voz

Se agrego una via rapida por voz para el modo 3, `Supervivencia Total`.

1. El jugador choca un bloque de multiplicacion.
2. Se generan las monedas/respuestas como antes.
3. Solo en modo 3, el bloque activo muestra `MIC`.
4. Si el jugador mantiene presionado el bloque y dice la respuesta correcta, la nave viaja a velocidad luz hacia la moneda correcta.
5. La recompensa no se calcula en el sistema de voz. El viaje termina chocando la moneda correcta y se reutiliza `hitAnswerCoin`.
6. Despues del viaje, la nave queda congelada y un sonar permanece parpadeando hasta que el cursor se acerca para rescatarla.
7. Ajuste visual posterior: el rayo de velocidad luz sale desde la nave (`player.x`, `player.y`) y no desde el bloque de multiplicacion.

Reglas importantes:

- No activar microfono ni viaje luminico en modos 1 y 2.
- No duplicar score, vida, enemigos ni progresion fuera de `hitAnswerCoin`.
- Si la respuesta vocal es incorrecta, mostrar y decir `Incorrecto`.
- Si el navegador no soporta o falla con reconocimiento de voz, mostrar y decir `Problema tecnico, intente mas tarde...` y reproducir sonido de colgado.

### 2. Satelite Defensa

Se agrego un arma educativa/arcade solo para modo 3, `Supervivencia Total`.

Flujo:

1. Al iniciar modo 3 hay 3 cargas de Satelite Defensa.
2. Mientras queden cargas, se muestra un indicador holografico verde neon al borde derecho del area de juego.
3. El indicador tiene un circulo, una mini nave satelite orbitando lento y un texto central en loop:
   - `PRESS/S`
   - las 3 multiplicaciones mas dificiles detectadas hasta ese minuto, por ejemplo `8x8`, `7x9`, `9x8`.
4. Al presionar `S`, aparece una seleccion holografica frente a la nave, separada de la nave y con 3 respuestas equidistantes.
5. Si la nave choca la respuesta correcta, consume una carga y activa el Sat Gun.
6. Si choca una respuesta incorrecta, consume una carga, reproduce error/explosion y el holograma se desvanece.
7. Al activarse, aparece un circulo suave alrededor de la nave y una mini nave satelite que orbita.
8. Si no hay enemigo en mira, el satelite gira rapidamente alrededor de la nave.
9. Si detecta enemigo, se detiene hacia el blanco, zigzaguea en un arco corto y dispara una lluvia de balas certeras.
10. Al terminar la municion, desaparecen satelite y circulo.

Reglas importantes:

- No activar Satelite Defensa en modos 1 y 2.
- No sumar score, vida, enemigos ni progresion educativa al activar el satelite.
- No reutilizar `hitAnswerCoin`; las respuestas del satelite usan `satelliteAnswerGroup`.
- Las multiplicaciones del satelite se eligen con historial de errores si existe; si no hay historial, se usa fallback estadistico dificil.
- La cantidad de disparos, velocidad de giro, arco de zigzag y velocidad de zigzag son parametros ajustables en Armeria.

## Archivos relevantes

- `src/core/mathSpeech.js`: modulo puro para normalizar texto hablado, convertir numeros en espanol y comparar contra la respuesta esperada.
- `src/core/satelliteDefense.js`: modulo puro para elegir multiplicaciones dificiles y generar opciones de respuesta del satelite.
- `game.js`: integracion con Phaser, reconocimiento de voz, viaje luminico, Satelite Defensa, efectos visuales, congelamiento de nave y sonar.
- `index.html`: carga modulos puros antes de `game.js` y expone parametros de Armeria/Lab.
- `tests/mathSpeech.test.js`: pruebas permanentes para la logica pura de voz matematica.
- `tests/satelliteDefense.test.js`: pruebas permanentes para seleccion de multiplicaciones dificiles y opciones del satelite.

## Estrategia de modularizacion

La regla usada fue separar lo que no depende de Phaser:

- Logica pura: `src/core/mathSpeech.js`.
- Logica pura: `src/core/satelliteDefense.js`.
- Efectos y escena: `game.js`.

Esto permite probar interpretacion de voz, seleccion de tablas dificiles y generacion de alternativas sin abrir navegador, sin microfono y sin Phaser.

## Validaciones usadas

Comandos recomendados:

```bash
node --check game.js
node --check src/core/mathSpeech.js
node --check src/core/satelliteDefense.js
node tests/mathSpeech.test.js
node tests/satelliteDefense.test.js
git diff --check
```

Que verifica cada uno:

- `node --check`: sintaxis JavaScript.
- `node tests/mathSpeech.test.js`: casos reales de respuestas habladas.
- `node tests/satelliteDefense.test.js`: casos de seleccion de tablas dificiles y opciones.
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
- Modo 3: aparece indicador holografico verde de Satelite Defensa al borde derecho.
- Modo 3: el indicador alterna `PRESS/S` y 3 multiplicaciones dificiles dinamicas.
- Modo 3: tecla `S` abre seleccion holografica separada de la nave.
- Satelite correcto: consume una carga, activa circulo/satelite y dispara hasta agotar municion.
- Satelite incorrecto: consume una carga, reproduce error/explosion y desvanece holograma.
- Armeria: modificar disparos, velocidad de giro, arco zigzag y velocidad zigzag en vivo.

## Reglas para futuras sesiones de AI

- Hacer cambios pequenos y verificables.
- Preferir extraer logica pura antes que mover codigo visual.
- No reescribir `game.js` completo en una sola pasada.
- No tocar `.DS_Store`.
- No modificar modos 1 y 2 al agregar ayudas arcade del modo 3.
- Mantener el juego jugable despues de cada cambio.
- Si se agrega una regla educativa, crear prueba permanente cuando sea posible.
- Para nuevas estadisticas, no mezclar persistencia directamente en `game.js`; crear modulo puro primero.

## Siguiente paso sugerido

Abrir un nuevo chat para implementar `estadisticas de aprendizaje`.

Propuesta conversada:

1. Usar almacenamiento local con exportacion/importacion JSON.
2. Empezar con `localStorage` por simplicidad; considerar `IndexedDB` si luego hay perfiles multiples o historial largo.
3. Crear modulo puro `src/core/mathProgress.js`.
4. Crear pruebas `tests/mathProgress.test.js`.
5. Hacer que `game.js` solo informe eventos, por ejemplo:

```js
MathProgress.recordAttempt({
    a,
    b,
    correct,
    responseMs,
    mode,
    method
});
```

Datos relevantes por multiplicacion:

- intentos totales;
- aciertos;
- errores;
- porcentaje de acierto;
- tiempo promedio de respuesta;
- fecha de ultimo intento;
- fecha de ultimo acierto;
- fecha de ultimo error;
- racha de aciertos;
- racha de errores;
- metodo de respuesta: moneda, voz, satelite;
- respuestas incorrectas elegidas.

Criterios de reforzamiento sugeridos:

- priorizar errores recientes;
- priorizar bajo porcentaje de acierto;
- priorizar respuestas lentas aunque sean correctas;
- reintroducir tablas no practicadas recientemente;
- bajar prioridad si hay racha de aciertos.

El nuevo chat deberia recibir este archivo como contexto y pedir: "Implementar estadisticas de aprendizaje con modulo puro, pruebas, persistencia local y export/import JSON, sin tocar modos 1 y 2 con ayudas arcade".
