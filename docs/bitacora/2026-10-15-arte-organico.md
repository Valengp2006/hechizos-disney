# 2026-10-15 — Dirección de arte: de lo digital a lo orgánico, estilo cuento

## Pedido
"El fondo y las letras se ven demasiado artificiales; quiero algo un poco más orgánico y más estilo Disney."

## Lectura (sin copiar nada de marca)
Un "estilo cuento ilustrado": cielo de crepúsculo pintado, luz cálida, bordes que no son perfectos, relleno con volumen y grano de papel. Del material de marca solo se toma el lenguaje (luz, polvo, brillo, calidez), como ya establecía el encargo.

## Fondo (`src/backdrop.js`)
- **Cielo de crepúsculo** en un shader: índigo arriba, violeta, ciruela abajo y un resplandor cálido al horizonte (algo desplazado, no simétrico).
- **Niebla** de ruido fractal en dos capas que se desplazan a distinta velocidad.
- **Estrellas** que titilan (con algunas cálidas) y **bokeh**: luces grandes desenfocadas que flotan.
- Viñeta suave. Todo es atmósfera: no lleva significado.
- `backdrop.mist`, `stars`, `starBrightness`, `bokeh` en `config.js`.

## Letras
- **Temblor de mano** (`font.wobble`): los contornos se desplazan suave y deterministamente; relleno, borde y puntos coinciden.
- **Relleno con luz y sombra** (`icons.shading`): más claro arriba-izquierda, más oscuro abajo; **grano de papel** (`icons.grain`).
- **Brillo de borde** (`icons.rim`): el contorno desplazado hacia arriba-izquierda, en un tono claro.
- **Aura cálida** detrás de la letra despierta (`icons.aura`).
- **Borde de puntos irregular** (brillo distinto por punto) y que se atenúa cuando la letra ya está rellena (`icons.dotFade`): deja de leerse como un contorno punteado.

## Verificación
- Capturas con las seis letras despiertas y el castillo: se ve como un cuento ilustrado sobre un cielo; JS por frame ~1.5 ms (el shader es barato).

## Pendiente / ideas
- El castillo sigue siendo línea fina: podría tener relleno translúcido (silueta violeta) para integrarse con el estilo pintado.
- Estrellas y bokeh pueden reaccionar al cursor (parpadean al pasar la luz).
- Texturizar la niebla con un grano de acuarela.

## A observar con personas
- ¿Se percibe "más cuento" o "más videojuego"? Comparar con `backdrop.enabled: false` y `icons.shading: 0`.
- ¿Se pierde legibilidad de las letras sobre un fondo menos oscuro?
