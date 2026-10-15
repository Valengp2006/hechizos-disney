# 2026-10-15 — Minijuegos: descubrir cada letra es un juego

## Pedido
"Que el descubrimiento de las letras, además del juego, fueran como minijuegos."

## Decisiones (de Valen)
- **El gesto abre el minijuego** (se conserva como "llave"; añade juego en vez de reemplazarlo).
- Los **seis a la vez**, no un prototipo de dos.
- Restricción del encargo: sin puntuación, niveles ni condición de victoria. Los minijuegos son **juguetes con una meta pequeña**, sin fallo ni números; el progreso se ve en la propia luz.

## Estructura
`gesto -> minijuego (estado PLAYING) -> hechizo (CONJURED) -> objeto (AWAKE)`
- Un solo juego a la vez (los gestos de otras letras se ignoran mientras se juega).
- **Empujoncito:** si lleva `games.assistAfterMs` (14 s) en el juego, avanza solo en `assistRampMs` (9 s).
- **Abandono:** si el cursor se aleja `games.abandonMs` (7 s) de la letra, el juego se cierra y la letra vuelve a latente.

## Los seis
| Letra | Minijuego | Mecánica |
|---|---|---|
| D | hazla sonar | energía = radianes girados alrededor de la campana; decae si paras; la campana se balancea y suelta ondas |
| I | enciende la vela | luciérnagas nacen abajo, te siguen si las acercas con tu luz y encienden la mecha al llegar (5) |
| S | sigue la luz | un guía recorre una onda de ida y vuelta; el progreso sube mientras lo sigues a menos de `tolerance` px |
| N | agita el cielo | cada cambio de sentido (x o y) de ≥18 px suma energía y suelta chispas; decae si paras |
| E | calma las cuerdas | velocidad < 28 px/s suma calma; moverte la resta; las cuerdas se encienden de a una y las notas orbitan |
| Y | riega la semilla | mantener hace crecer el tallo; soltar con crecimiento ≥ 0.3 florece (profundidad = crecimiento), antes se marchita |

## Hallazgos al probarlo (con entrada sintética)
- El juego de la N nunca terminaba: la energía topaba en 1 y justo después se le restaba el decaimiento (0.994 < 1). Se cierra con un margen (`>= 0.97`).
- Verificados de punta a punta: D, N, E, Y (gesto -> juego -> hechizo) y S (abre y termina con el empujoncito). I abre y se juega; el transporte de luciérnagas no se probó a mano con precisión.
- Para probar con el navegador del entorno: esperar a que cargue la fuente antes de gesticular y mover el cursor mientras se espera (si no, "quieto" dispara y hace cooldown).

## A observar con personas
- ¿Entienden cada reto sin explicación? Comparar con y sin la guía.
- ¿Duran lo justo? D y N pueden ser demasiado rápidos o lentos según la persona: ajustar `games.*`.
- ¿El empujoncito llega demasiado tarde (14 s) para una exhibición?
- ¿Se sienten como juego o como trámite antes del hechizo?
