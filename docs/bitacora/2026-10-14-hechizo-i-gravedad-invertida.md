# 2026-10-14 — Hechizo I: gravedad invertida

## Qué se hizo
- `src/spells/i.js`: el asta se enciende, se estira hacia arriba y suelta polvo de su propio contorno que primero **cae** y luego **invierte** su sentido y asciende. Al terminar vuelve a su tamaño y queda dorada con un hilo de polvo.
- Mientras la gravedad está invertida, el **polvo ambiental de toda la pantalla también sube** (`riseGlobalLift`).
- `letter.js`: el cuerpo de la letra (`body`) se puede estirar sin deformar polvo ni destello.

## Decisiones (de Valen)
- Se estira todo el cuerpo (opción A), el polvo sale de toda la letra y el asta **vuelve** a su tamaño.
- Criterio de diseño: el atributo de marca es *hacer posible lo imposible*, así que el hechizo debe **leerse** como imposible. Por eso la caída previa a la inversión: se ve "lo normal" antes de verse "lo imposible".

## Parámetros y qué esperar
- `riseStretch` 1.6: 2.2 es una torre; 1.0 desactiva el estiramiento.
- `riseFallSpeed` 40 / `riseReverseMs` 500: cuánto cae y cuánto tarda en invertirse. Con `riseFallSpeed` 0 se pierde el momento de inversión.
- `riseSpeed` 90, `riseHeight` 420, `riseDustPerPoint` 4: velocidad, alcance y densidad.
- `riseGlobalLift` 60: cuánto sube el polvo de toda la pantalla; 0 lo deja solo en la letra.

## Cambios al reconocedor y al reparto (hallazgos)
- Un gesto precedido de otro recorrido se reconocía tarde, con el cursor ya parado lejos de la letra. Ahora cada trazo se evalúa también en sufijos de la ventana (`gestures.windowFractions`).
- El gesto lo recibe la letra más cercana al **final** del trazo (últimos `letters.gestureTargetMs` = 500 ms). El centro y el inicio del trazo se contaminaban con la aproximación.
- Prueba: aproximación larga desde la D y subida sobre la I -> conjura la I.

## Nota de método
- Las capturas del navegador de pruebas están escaladas (800x600) respecto al viewport real (1024x768): mis primeras pruebas sintéticas usaban coordenadas equivocadas y parecían un bug. Para probar, usar `window.innerWidth/innerHeight`.
- El panel del pane de pruebas se detiene (0 fps) si la pestaña no está al frente.
