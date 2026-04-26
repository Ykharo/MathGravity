# Math Gravity Arcade

Bienvenido al código fuente de Math Gravity Arcade. Este documento describe la arquitectura y la lógica fundamental actual del juego.

## Arquitectura del Motor
El juego está construido sobre **Phaser 3** utilizando únicamente su sistema de físicas (Arcade Physics), geometría dinámica (`Phaser.Graphics`) en lugar de sprites estáticos pesados, y un flujo de eventos continuo (`update`). 
Es una **PWA** (Progressive Web App) completamente offline con un Service Worker integrado (`sw.js`).

## Lógica de Juego y Estados Matemáticos
El juego no usa escenas múltiples; la progresión ocurre en tiempo real y fluye entre dos estados lógicos (`currentPhase`):

1. **`WAITING_BLOCK`**:
   - Aparecen bloques matemáticos flotando en la parte superior.
   - La nave debe chocar contra uno para seleccionarlo ("Aceptar la misión").
   - **Algoritmo de Generación**: 
     - Mantiene un estricto control "Anti-Clonación". Verifica que no aparezcan dos bloques con el mismo resultado en pantalla (para que las opciones de respuesta no colisionen).
     - Prioriza el registro histórico: si el usuario ha fallado previamente (registrado en `failedMath`), existe un 40% de probabilidad de forzar una de esas multiplicaciones erradas.
     - Si la salud está por debajo de 75%, hay probabilidad de generar un bloque "HEAL" (verde).
     - Hay pequeña probabilidad de generar bloque "SHIELD" (neón celeste).

2. **`WAITING_ANSWER`**:
   - Al colisionar con el bloque, el resto de los bloques se vuelve transparente.
   - Se generan monedas/asteroides con diferentes números, rebotando aleatoriamente en el mapa. Una de ellas contiene la respuesta matemática correcta, y las otras contienen engaños (+/- 1, 2, 5, etc).
   - **Respuesta Correcta**: 
     - La moneda se vuelve verde.
     - Sube el Score, se aplican curaciones o escudos (si aplica).
     - Nace un enemigo nuevo.
     - La escena se limpia y vuelve a `WAITING_BLOCK`.
   - **Respuesta Incorrecta**:
     - Fuerte rebote físico (rechazo).
     - La moneda errada se destruye.
     - El jugador pierde 20% de HP.
     - Nace un enemigo nuevo por penalidad.
     - Se anota el error en la lista `failedMath` para ser priorizado en futuros bloques.

## Sistema de Físicas y Autopiloto
El juego simula "gravedad cero" e inercia espacial:
- **Movimiento**: Arrastre controlado (`drag`) y aceleración angular (la nave "dobla" hacia donde el ratón/dedo apunta).
- **Auto-Piloto**: Calcula un vector de atracción al objetivo (puntero) y un vector de repulsión drástico (evasión algorítmica) de los enemigos cercanos. Si el jugador tiene el escudo activo, la evasión se invierte y el autopiloto se vuelve un modo *Kamikaze* magnético hacia el enemigo para destruirlo.

## Dificultad Dinámica (Progresión)
1. **Nivel 1 (0-9 Puntos)**: Los enemigos giran sobre su propio eje y tienen velocidades aleatorias simples.
2. **Nivel 2 (10+ Puntos)**: 
   - Los enemigos cambian a color rojo oscuro.
   - Adquieren el comportamiento **Swarm/Boids** (Enjambre): Se agrupan, mantienen separación entre ellos y persiguen agresivamente al jugador como un banco de peces letal.
   - Se desbloquea el arma de **Singularidad Temporal** (ralentiza el tiempo de los enemigos a un 5% simulando una hiper-densidad gravitatoria).
