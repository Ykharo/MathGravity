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

### 3. Estadisticas de aprendizaje

Se agrego seguimiento de progreso educativo con persistencia local y perfiles separados.

Arquitectura:

1. `src/core/mathProgress.js` es el modulo puro. No depende de Phaser.
2. `game.js` solo registra eventos con `recordLearningAttempt`; no calcula estadisticas ni administra `localStorage`.
3. `index.html` carga `mathProgress.js` antes de `game.js` y muestra el selector de perfil.
4. `tests/mathProgress.test.js` cubre conteo de intentos, separacion de perfiles, export/import JSON y datos por multiplicacion.

Datos registrados por multiplicacion:

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
- metodo de respuesta: `coin`, `voice`, `satellite`;
- respuestas incorrectas elegidas.

Perfiles locales:

- Perfil jugador: `hija`, mostrado en UI como `Isabella`.
- Perfil desarrollador: `dev`, mostrado como `Desarrollador`.
- Cada perfil usa una clave separada de `localStorage`, por ejemplo:
  - `mathGravity.learningProgress.v1.profile.hija`
  - `mathGravity.learningProgress.v1.profile.dev`
- Se conserva el id interno `hija` para no perder estadisticas ya guardadas, aunque el nombre visible sea `Isabella`.

Export/import JSON:

- `MathProgress.exportProgressJson(null, { profileId: "hija" })`
- `MathProgress.importProgressJson(json, { profileId: "hija" })`

Acceso desde consola del navegador:

```js
MathProgress.loadProgress({ profileId: "hija" })
MathProgress.loadProgress({ profileId: "dev" })
MathProgress.exportProgressJson(null, { profileId: "hija" })
```

Integracion en el juego:

- Al seleccionar un bloque matematico, `game.js` guarda el inicio de respuesta (`progressStartedAt`).
- Al responder por moneda, voz o Satelite Defensa, `game.js` informa el intento al modulo puro.
- La respuesta correcta por voz sigue terminando en `hitAnswerCoin`, por lo que no duplica recompensas.
- La respuesta incorrecta por voz registra el intento incorrecto aunque no choque una moneda.
- El Satelite Defensa registra su respuesta con metodo `satellite`, sin sumar score ni vida.

Reglas importantes:

- No mezclar persistencia directamente en `game.js`.
- No usar las estadisticas para agregar ayudas arcade en modos 1 y 2.
- Mantener perfiles locales simples; no hay login ni backend.
- Si luego se necesita sincronizacion multi-dispositivo, migrar persistencia desde `localStorage` a un backend o `IndexedDB`, manteniendo la API de eventos.

### 4. Controles de dano en Armeria

Se agregaron controles para probar balance en vivo:

- `Daño por Choque`: valor directo que se resta de vida al chocar con enemigos. Default `20`.
- `Daño por Proyectiles`: valor directo que se resta de vida al recibir disparos enemigos. Default `10`.

No son porcentajes ni multiplicadores. Si el slider dice `5`, se restan 5 puntos de vida.

## Archivos relevantes

- `src/core/mathSpeech.js`: modulo puro para normalizar texto hablado, convertir numeros en espanol y comparar contra la respuesta esperada.
- `src/core/satelliteDefense.js`: modulo puro para elegir multiplicaciones dificiles y generar opciones de respuesta del satelite.
- `src/core/mathProgress.js`: modulo puro para estadisticas de aprendizaje, perfiles locales, localStorage y export/import JSON.
- `game.js`: integracion con Phaser, reconocimiento de voz, viaje luminico, Satelite Defensa, efectos visuales, congelamiento de nave, sonar y registro minimo de eventos educativos.
- `index.html`: carga modulos puros antes de `game.js`, expone parametros de Armeria/Lab y muestra selector de perfil.
- `tests/mathSpeech.test.js`: pruebas permanentes para la logica pura de voz matematica.
- `tests/satelliteDefense.test.js`: pruebas permanentes para seleccion de multiplicaciones dificiles y opciones del satelite.
- `tests/mathProgress.test.js`: pruebas permanentes para estadisticas, perfiles y export/import JSON.

## Estrategia de modularizacion

La regla usada fue separar lo que no depende de Phaser:

- Logica pura: `src/core/mathSpeech.js`.
- Logica pura: `src/core/satelliteDefense.js`.
- Logica pura: `src/core/mathProgress.js`.
- Efectos y escena: `game.js`.

Esto permite probar interpretacion de voz, seleccion de tablas dificiles, generacion de alternativas y estadisticas de aprendizaje sin abrir navegador, sin microfono y sin Phaser.

## Validaciones usadas

Comandos recomendados:

```bash
node --check game.js
node --check src/core/mathSpeech.js
node --check src/core/satelliteDefense.js
node --check src/core/mathProgress.js
node tests/mathSpeech.test.js
node tests/satelliteDefense.test.js
node tests/mathProgress.test.js
git diff --check
```

Que verifica cada uno:

- `node --check`: sintaxis JavaScript.
- `node tests/mathSpeech.test.js`: casos reales de respuestas habladas.
- `node tests/satelliteDefense.test.js`: casos de seleccion de tablas dificiles y opciones.
- `node tests/mathProgress.test.js`: conteo de intentos, perfiles separados y export/import JSON.
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
- Menu: selector de perfil muestra `Isabella` y `Desarrollador`.
- Menu: al seleccionar `Isabella`, los botones de modo cambian borde/texto a rosado.
- Armeria: `Daño por Choque` y `Daño por Proyectiles` modifican dano real en vivo.
- Consola: `MathProgress.loadProgress({ profileId: "hija" })` muestra estadisticas de Isabella.

## Reglas para futuras sesiones de AI

- Hacer cambios pequenos y verificables.
- Preferir extraer logica pura antes que mover codigo visual.
- No reescribir `game.js` completo en una sola pasada.
- No tocar `.DS_Store`.
- No modificar modos 1 y 2 al agregar ayudas arcade del modo 3.
- Mantener el juego jugable despues de cada cambio.
- Si se agrega una regla educativa, crear prueba permanente cuando sea posible.
- Para nuevas estadisticas, no mezclar persistencia directamente en `game.js`; extender modulo puro primero.
- `game.js` debe registrar eventos; los calculos educativos deben vivir en `src/core`.
- Mantener compatibilidad con los perfiles locales `hija`/`dev`.

## Siguiente paso sugerido

Abrir un nuevo chat leyendo primero este archivo y pedir cambios pequenos. Las estadisticas de aprendizaje ya estan implementadas.

Pedido recomendado para el proximo chat:

```text
Hola, lee primero docs/ai-development-notes.md y continua desde ahi.

Reglas:
- cambios pequenos y verificables;
- no tocar .DS_Store;
- no convertir game.js en mas monobloque;
- si una logica no depende de Phaser, crear o extender modulo puro en src/core;
- agregar test permanente cuando sea posible;
- game.js debe registrar eventos, no calcular logica educativa compleja;
- no agregar ayudas arcade a modos 1 y 2;
- mantener el juego jugable despues de cada cambio.
```

Ideas futuras razonables:

- Crear una vista/panel de estadisticas dentro del menu para no depender de consola.
- Usar `MathProgress` para sugerir practicas futuras sin crear ayudas arcade en modos 1 y 2.
- Crear botones UI de export/import JSON por perfil.
### Modulo: ComputerTutor (RetroMathComputer) - ESTADO ACTUAL (ABRIL 2026)

- **Ubicación**: `labs/computer-tutor/`, `src/core/computerTutor/`, `src/phaser/computerTutor/`, `tests/computerTutor/`.
- **Arquitectura**: Lógica pura modular (Core) + Escenas Phaser (UI). Independiente pero integrado.
- **Estado**: **COMPLETADO E INTEGRADO**.
- **Interfaz**: Consola MG-88 táctica. Soporta teclado y iPad (hit-areas ampliadas).
- **Estética**: Retro Monocromático (Verde Fósforo). Achurado (Hatching) para distinguir áreas.
- **Localización**: 100% en Español (etiquetas, pistas y errores).
- **Mecánicas Educativas Implementadas**: 
    - **Área (G3)**: Tablas generales con descomposición y achurado.
    - **Sustracción (G2-9)**: Estrategia de "Casi 10" para la tabla del 9.
    - **Conteo Rítmico (G1-5)**: Secuencia animada para la tabla del 5.
    - **Dobles (G1-2)**: Estrategia de suma duplicada para la tabla del 2.
    - **Agregar Cero (G1-10)**: Truco del valor posicional para la tabla del 10.
- **Feedback**: Sistema de audio retro (Paso, Éxito, Error) y efectos de sacudida (Shake) en validaciones fallidas.
- **Refinamientos Finales (Abril 2026)**:
    - **Rotación Pedagógica**: Implementada la propiedad conmutativa automática en el Grupo 3 para asegurar siempre 5 columnas de referencia (ej: `7x3` se convierte en `3x7`).
    - **Tablas Especiales**: Las tablas del 2, 5 y 10 mantienen su forma natural (no se rotan) para mayor simplicidad.
    - **Mapas Algebraicos**: Limpieza de redundancias; solo muestran transpuesta si hubo rotación.
    - **Input Robusto**: El analizador ahora acepta formatos como `5X8`, `5*8` y variaciones con espacios.
    - **Guías de Dimensión**: Estandarizadas en todas las mecánicas, incluyendo las especiales (2, 5, 10).
    - **Consistencia Visual**: Unificación total al verde neón MG-88 y ajuste de opacidad de iconos al 80%.

## Reglas para futuras sesiones de AI

- El `ComputerTutor` debe mantenerse aislado en su carpeta; no agregar dependencias de `game.js` en su `core`.
- La integración en `game.js` se limita a la llamada de apertura (`openTutor`) y la pausa de escena.
- Cualquier nueva estrategia pedagógica debe implementarse primero como una clase en `src/phaser/computerTutor/mechanics/`.
- Mantener la estética retro-monocromática (usar solo verde fósforo y achurado).

## Siguiente paso sugerido

1.  **Ajuste Fino de Audio**: Reemplazar los placeholders (`laser.mp3`, `success.mp3`) por archivos específicos con sonido "8-bit computer" grabados en `assets/audio/computerTutor/`.
2.  **Integración Avanzada**: Hacer que el tutor se abra automáticamente cuando el jugador comete 3 errores seguidos en una misma multiplicación en Modo 3.
3.  **Visualización de Errores**: Integrar las estadísticas de `MathProgress` dentro de la pantalla de análisis del tutor.

Pedido recomendado para el proximo chat:

```text
Hola, lee primero docs/ai-development-notes.md.
El ComputerTutor ya está integrado y funcional. 
Reglas:
- No romper la independencia del módulo tutor.
- Mantener la estética retro MG-88.
- Verificar cambios en labs/computer-tutor/index.html y en el juego principal.
```

