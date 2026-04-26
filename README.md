# Math Gravity Arcade 🚀

**Versión:** 1.0 (Iteration Nivel 2 y PWA Offline)
**Motor:** Phaser 3.60 (Minimalista/Memoria Vectorial)

## Objetivo Core del Juego
Math Gravity Arcade no es un simple test de matemáticas escolares. Es una **supervivencia hiper-vectorial dinámica**. Tienes un barco sometido a inercia real (gravedad flotante, aceleración matemática). Pierdes el control muy fácil. Para ganar armas (escudos, control temporal), debes resolver multiplicaciones cazando bloques erráticos.

Mientras la nave es asediada, todo se maneja en un espacio pseudo-físico: 
- Nivel 1: Naves rojas tontas con inercia aleatoria.
- Nivel 2 (Score 10+): Modo "Cazadores Oscuros". Comportamiento Enjambre (Swarm/Boids) acosador.

## Mecánicas Técnicas / Hacks del Protagonista

### 1. Motor de Vuelo (Auto-Pilot & Lerp)
A diferencia de un control direccional estricto, el jugador pulsa la pantalla y la nave sufre un evento `moveToObject` elástico. Existe un modo "Auto-Piloto Evasivo" (`GLOBAL_AUTOPILOT`) que permite al jugador enfocarse solo en pensar en matemáticas, delegando el manejo a un radar verde evasivo. (El auto-piloto se vuelve Kamikaze si posee un escudo y ataca enemigos).

### 2. Antivirus de Clonación (Filtro nivel 5)
Para evitar que se repita por casualidad la misma respuesta en pantalla (causando choques caóticos), se impuso una cola histórica. Si luego de 5 tiradas aleatorias sigue generando el mismo número repetitivo, el "cortafuego" se quita y escupe 2 números totalmente aleatorios para romper el ciclo infinito de Phaser mathRandom.

### 3. La Singularidad (Núcleo Temporal - Nivel 2)
Al alcanzar el Nivel 2, cazar 3 respuestas carga un arma de gelatina espacial. Al pulsar el botón "LAB/SINGULARIDAD", el fondo se torna Gris. Todas las físicas enemigas, paredes giratorias e inercias bajan a 0.05 por **20 segundos de gracia divina**, convirtiendo a las naves acosadoras en tortugas estupefactas para despejar la pantalla.

## Entorno Técnico y Bugs Arreglados por la IA:
*   **Empaquetado iOS Offline:** El juego soporta Safari PWA Standalone. Generé Service Worker (`sw.js`).
*   **Vector a AppIcon:** iOS no soporta `.svg`, se debatió este bug recurrente y se migró el Apple-Touch-Icon a `.png` forzosamente en terminal para resolverlo.
*   **Bug de las Letras Góticas de Apple (Fallback cursive):** El iPhone/iPad caía en la trampa tipográfica de interpretar `cursive` como Script Antiguo. Se neutralizó permanentemente en `game.js` pasando la topografía a `Arial, sans-serif` plana.
