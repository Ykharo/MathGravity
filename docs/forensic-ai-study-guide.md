# Guia forense y didactica para estudiar Math Gravity con AI

Este documento esta pensado para entregarse junto con el proyecto a una AI de desarrollo, incluso una AI con menor capacidad tecnica. Su objetivo no es pedirle que programe de inmediato, sino que guie un estudio paso a paso del codigo, de las decisiones buenas y malas, y de como se puede trabajar mejor con AI en futuras sesiones.

## Instruccion inicial para la AI tutora

Usa este texto como prompt inicial:

```text
Actua como tutora de desarrollo de software. Quiero estudiar este proyecto de forma forense y didactica.

No empieces haciendo cambios de codigo. Primero ayudame a entender:
- como esta estructurada la aplicacion;
- por que game.js se volvio un monobloque;
- que decisiones fueron buenas y cuales generaron deuda tecnica;
- como se modularizaron las ultimas funciones;
- como leer los tests;
- como deberia trabajar con AI de desarrollo en adelante.

Explica paso a paso, con lenguaje simple, usando ejemplos concretos del repo. Cuando menciones codigo, cita archivo y funcion. Hazme preguntas de comprension antes de pasar al siguiente tema.
```

## Objetivos de aprendizaje

Al terminar el estudio, el desarrollador deberia poder explicar:

- que es una aplicacion Phaser basica;
- que responsabilidades tiene `game.js`;
- por que un archivo monolitico se vuelve dificil de mantener;
- que significa separar logica pura de integracion visual;
- que es un modulo UMD simple como los usados en `src/core`;
- por que los tests actuales pueden correr con Node sin abrir el navegador;
- como se integraron nuevas funciones sin reescribir todo el juego;
- como pedirle a una AI cambios pequenos, verificables y con buenos limites.

## Mapa rapido del proyecto

Archivos principales:

- `index.html`: pagina principal, menu, paneles Lab/Armeria, variables globales de ajuste y carga de scripts.
- `game.js`: escena Phaser principal. Contiene fisicas, input, enemigos, UI, audio, armas, matematicas, progreso de juego y efectos.
- `src/core/mathSpeech.js`: modulo puro para interpretar respuestas habladas en espanol.
- `src/core/satelliteDefense.js`: modulo puro para elegir multiplicaciones dificiles y opciones del Satelite Defensa.
- `src/core/mathProgress.js`: modulo puro para estadisticas de aprendizaje, perfiles locales y persistencia en `localStorage`.
- `tests/mathSpeech.test.js`: pruebas de interpretacion de voz.
- `tests/satelliteDefense.test.js`: pruebas de seleccion de ejercicios para el satelite.
- `tests/mathProgress.test.js`: pruebas de estadisticas, perfiles y export/import JSON.
- `docs/ai-development-notes.md`: memoria operativa para continuar el desarrollo con otra AI.

## Diagnostico forense del monobloque

`game.js` concentra demasiadas responsabilidades. Esto no significa que el proyecto este "mal"; significa que crecio de forma natural mientras se prototipaba un juego. El problema aparece cuando nuevas funciones necesitan tocar muchas zonas del archivo y aumenta el riesgo de romper comportamientos existentes.

Responsabilidades mezcladas en `game.js`:

- configuracion de Phaser;
- carga y creacion de assets;
- movimiento de la nave;
- fisicas y colisiones;
- enemigos y proyectiles;
- armas del modo 3;
- audio, musica y voces;
- generacion de ejercicios matematicos;
- UI de vida, score y botones;
- reglas de modos 1, 2 y 3;
- integracion con modulos puros;
- efectos visuales complejos.

Senales de deuda tecnica:

- muchas variables globales compartidas;
- funciones largas que hacen varias cosas;
- reglas de juego mezcladas con efectos visuales;
- dificultad para saber si un cambio afecta solo un modo o todos;
- alto costo de lectura antes de modificar;
- testeo automatico limitado para lo que depende de Phaser.

Decisiones comprensibles:

- para prototipar un juego, un archivo unico permite avanzar rapido;
- Phaser suele incentivar concentrar escena, fisicas y callbacks en un mismo lugar;
- al inicio no siempre se conoce que partes se volveran reutilizables;
- mantener el juego funcionando era mas importante que redisenar arquitectura.

Decision que conviene cambiar en adelante:

No seguir agregando logica educativa o reglas calculables directamente en `game.js` si pueden vivir en `src/core`.

Regla practica:

```text
Si una funcion se puede probar sin Phaser, sin canvas, sin audio y sin DOM,
deberia vivir fuera de game.js.
```

## Las 3 funciones modularizadas

### 1. Voz matematica: `mathSpeech.js`

Problema que resuelve:

El navegador entrega texto hablado. El juego necesita saber si ese texto equivale a un numero esperado.

Buena decision:

La normalizacion de texto y el parseo de numeros en espanol no dependen de Phaser. Por eso se pusieron en un modulo puro.

Preguntas para estudiar:

- Que hace `normalizeText`?
- Por que se eliminan tildes y signos?
- Como `parseSpanishNumber` convierte "cuarenta y ocho" en `48`?
- Por que `isSpokenAnswerCorrect` es una funcion pequena?
- Que casos cubre `tests/mathSpeech.test.js`?

Respuesta esperada:

La voz es una entrada impredecible. El modulo intenta reducir variaciones del habla a un numero comparable. El test asegura que frases reales sigan funcionando aunque se cambie el codigo.

### 2. Satelite Defensa: `satelliteDefense.js`

Problema que resuelve:

El modo 3 necesita elegir multiplicaciones dificiles y generar opciones de respuesta para activar el Satelite Defensa.

Buena decision:

La eleccion de multiplicaciones y alternativas es logica pura. No necesita Phaser. Phaser solo dibuja monedas, textos y efectos.

Preguntas para estudiar:

- Que representa `DEFAULT_DIFFICULT_FACTS`?
- Que hace `normalizeFact`?
- Por que `getDifficultFacts` ordena por errores?
- Por que se eliminan duplicados?
- Como `chooseChallenge` usa un indice para rotar ejercicios?
- Como `generateAnswerOptions` evita repetir respuestas?
- Que verifica `tests/satelliteDefense.test.js`?

Respuesta esperada:

El modulo transforma historial de errores en desafios. Esto permite testear la seleccion de ejercicios sin abrir el juego.

Riesgo o limite:

Actualmente usa `failedMath` de `game.js`, que es memoria de la partida. En el futuro podria alimentarse desde `MathProgress` para usar estadisticas persistentes.

### 3. Estadisticas de aprendizaje: `mathProgress.js`

Problema que resuelve:

Registrar desempeno educativo por multiplicacion, separar perfiles y persistir datos localmente.

Buena decision:

La estadistica es dominio educativo, no visual. Por eso vive en un modulo puro. `game.js` solo informa eventos.

Eventos desde `game.js`:

```js
MathProgress.recordAttempt({
    a,
    b,
    correct,
    responseMs,
    mode,
    method,
    answer,
    profileId
});
```

Preguntas para estudiar:

- Que es un intento (`attempt`)?
- Que datos minimos necesita una estadistica?
- Por que hay `normalizeAttempt`?
- Que hace `reduceProgress`?
- Como se calcula `accuracy`?
- Por que se guarda `responseCount` ademas de `averageResponseMs`?
- Como se separan los perfiles `hija` y `dev`?
- Por que el perfil visible se llama `Isabella`, pero el id sigue siendo `hija`?
- Como funcionan `exportProgressJson` e `importProgressJson`?
- Que cubre `tests/mathProgress.test.js`?

Respuesta esperada:

El modulo recibe eventos pequenos y los transforma en estado acumulado. La separacion por perfil evita que pruebas del desarrollador contaminen el progreso de Isabella.

Riesgo o limite:

`localStorage` es simple y suficiente para un dispositivo, pero no sincroniza datos entre computadores. Si se requieren multiples dispositivos o historial grande, se deberia evaluar `IndexedDB` o backend.

## Como se integra una funcion modular en el monobloque

Patron usado:

```text
1. Crear modulo puro en src/core.
2. Crear test en tests.
3. Cargar el modulo desde index.html antes de game.js.
4. En game.js, llamar al modulo desde eventos existentes.
5. Evitar duplicar reglas de recompensa, vida, score o enemigos.
```

Ejemplo con estadisticas:

- `hitMathBlock` marca inicio del tiempo de respuesta.
- `hitAnswerCoin` registra acierto/error por moneda.
- voz correcta marca metodo `voice` y luego reutiliza `hitAnswerCoin`.
- voz incorrecta registra error directamente, porque no choca moneda.
- `hitSatelliteAnswer` registra metodo `satellite`.

Pregunta importante para la AI tutora:

```text
Muestrame el flujo completo de una respuesta correcta por voz, desde el bloque matematico hasta el registro estadistico, sin saltarte funciones.
```

La AI deberia recorrer:

- `hitMathBlock`
- `startMathVoiceListening`
- `startLightSpeedTravel`
- `hitAnswerCoin`
- `recordLearningAttempt`
- `MathProgress.recordAttempt`

## Buenas decisiones tomadas

- Extraer logica pura a `src/core`.
- Crear tests permanentes para cada modulo nuevo.
- Mantener `game.js` como integrador de eventos, no como calculador de estadisticas.
- No activar ayudas arcade en modos 1 y 2.
- Reutilizar funciones existentes como `hitAnswerCoin` para no duplicar recompensas.
- Usar perfiles locales antes de crear un sistema de usuarios complejo.
- Documentar decisiones en `docs/ai-development-notes.md`.
- Mantener cambios pequenos y verificables.

## Decisiones con deuda o riesgo

- `game.js` sigue siendo demasiado grande.
- Muchas variables globales dificultan razonar sobre efectos laterales.
- `index.html` contiene mucha logica JS inline y controles de debug.
- La UI de estadisticas aun no existe; por ahora se consulta desde consola.
- `failedMath` y `MathProgress` aun no estan unificados.
- No hay tests automaticos para integracion Phaser.
- La persistencia local no sirve para sincronizacion entre dispositivos.

## Preguntas que el desarrollador debe hacerle a la AI

Usar estas preguntas durante el estudio:

1. Cual es la responsabilidad principal de este archivo?
2. Que partes de esta funcion son logica pura y cuales son efectos visuales?
3. Que variables globales usa esta funcion?
4. Que otras funciones llama?
5. Que podria romperse si cambio esta linea?
6. Como se podria testear esto sin abrir Phaser?
7. Esta logica pertenece a `game.js` o a `src/core`?
8. Que regla de negocio se esta protegiendo?
9. Que test confirma que esto funciona?
10. Que deuda tecnica queda despues de este cambio?

## Ejercicios guiados sugeridos

### Ejercicio 1: leer un test primero

Abrir `tests/mathProgress.test.js`.

Tareas:

- identificar que datos de entrada crea;
- identificar que resultado espera;
- explicar por que usa un `memoryStorage`;
- explicar como comprueba que `hija` y `dev` no se mezclan.

### Ejercicio 2: seguir una respuesta incorrecta por moneda

Pedir a la AI:

```text
Guiame por el flujo de una respuesta incorrecta por moneda. Indica que cambia en juego, vida, enemigos, failedMath y MathProgress.
```

La AI deberia encontrar `hitAnswerCoin` y explicar:

- registra intento incorrecto;
- reproduce explosion;
- rebota la nave;
- destruye la moneda falsa;
- aplica dano;
- genera enemigo;
- incrementa `failedMath`.

### Ejercicio 3: comparar modulo puro vs integracion Phaser

Comparar:

- `src/core/satelliteDefense.js`
- funciones `spawnSatelliteChallenge` y `hitSatelliteAnswer` en `game.js`

Objetivo:

Entender que el modulo decide el desafio, mientras `game.js` dibuja, anima y detecta colisiones.

### Ejercicio 4: estudiar una deuda tecnica

Elegir una funcion larga de `game.js` y pedir:

```text
Analiza esta funcion. No la refactorices. Separala mentalmente en responsabilidades y dime cuales podrian extraerse en el futuro.
```

Objetivo:

Aprender a ver limites antes de pedir cambios.

## Como pedir cambios futuros a una AI

Prompt recomendado:

```text
Antes de implementar, lee docs/ai-development-notes.md y docs/forensic-ai-study-guide.md.

Quiero un cambio pequeno y verificable.
Primero identifica:
- que parte depende de Phaser;
- que parte puede ser modulo puro;
- que archivos tocarias;
- que tests agregarias o ejecutarias;
- que comportamiento existente no debe cambiar.

Luego implementa, valida con comandos y resume riesgos.
No toques .DS_Store.
```

Prompt para evitar agrandar el monobloque:

```text
No agregues logica calculable directamente a game.js si puede vivir en src/core.
game.js debe registrar eventos o llamar funciones, no acumular nuevas reglas complejas.
```

Prompt para pedir explicacion didactica:

```text
Explicame esta funcion como si estuviera aprendiendo arquitectura de software.
Divide la explicacion en:
1. proposito;
2. entradas;
3. salidas o efectos;
4. dependencias;
5. riesgos;
6. como se podria testear.
```

## Glosario minimo

- Modulo puro: archivo con funciones que no dependen de Phaser, DOM, audio ni canvas.
- Integracion: codigo que conecta eventos del juego con modulos, UI o efectos.
- Estado global: variable compartida por muchas funciones, como `score`, `currentGameMode` o `playerHealth`.
- Deuda tecnica: decisiones que permitieron avanzar rapido, pero encarecen cambios futuros.
- Test unitario: prueba pequena que verifica una funcion o modulo sin correr todo el juego.
- Persistencia: guardar datos para que sigan existiendo despues de recargar la pagina.
- Perfil local: identidad simple guardada en el navegador, sin login ni servidor.

## Ruta de estudio recomendada

1. Leer `docs/ai-development-notes.md`.
2. Leer este documento completo.
3. Abrir `tests/mathSpeech.test.js` y luego `src/core/mathSpeech.js`.
4. Abrir `tests/satelliteDefense.test.js` y luego `src/core/satelliteDefense.js`.
5. Abrir `tests/mathProgress.test.js` y luego `src/core/mathProgress.js`.
6. Buscar en `game.js` las llamadas a:
   - `MathSpeech`
   - `SatelliteDefense`
   - `MathProgress`
7. Recorrer un flujo completo de juego con la AI tutora.
8. Identificar una funcion candidata a futura extraccion.
9. Escribir un prompt de cambio pequeno antes de programar.

## Cierre conceptual

Este proyecto no debe verse como "un error" por tener un monobloque. Debe verse como un prototipo que crecio y ahora esta entrando en una etapa mas madura.

La leccion principal es:

```text
La AI puede acelerar mucho el desarrollo, pero necesita limites arquitectonicos claros.
Si no se le dan limites, tiende a agregar codigo donde ya existe codigo.
Si se le dan reglas, tests y modulos pequenos, puede ayudar a mejorar el sistema sin romperlo.
```

