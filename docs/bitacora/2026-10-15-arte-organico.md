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

## Castillo pintado (2026-10-15)
- **Siluetas rellenas** (`finale.castleFill`): torres, muros y almenas pasan de línea fina a una silueta violeta profunda, con un poco de calor desde abajo (la luz de las letras) y fundiéndose con el cielo arriba. El contorno fino queda como filo.
- **Ventanas encendidas** (rectángulos dorados que parpadean), **banderines rellenos** (triángulos rosa y oro que ondean) y **niebla cálida** al pie (`finale.castleMist`).
- Sigue siendo genérico: asimétrico, sin torre central ni techos cónicos; las torres salen de las letras.
- Hallazgos al probarlo: las siluetas bajaban a media letra y dejaban una banda detrás (ahora apoyan sobre el borde superior de cada letra), y la niebla más el aura lavaban las letras (se bajaron `castleMist` y `icons.aura`). Los colores de relleno se aclaraban por tratarse como lineales: se convierten desde sRGB.
- Parámetros: `castleFill`, `castleTop`, `castleBottom`, `castleMist`.

## Mejoras de vida y profundidad (2026-10-15)
1. **El cielo reacciona a tu luz** (`backdrop.react`): la niebla se aparta alrededor del cursor, el cielo se calienta un poco ahí y las estrellas cercanas brillan más.
2. **Puerta de la D como arco iluminado:** un rectángulo con medio círculo arriba, en dorado cálido (más claro arriba) con un leve latido, visible a través del hueco de la letra.
3. **Capa lejana** (`finale.farLayer`, `farFill`, `farTop`, `farBottom`): una cresta de colinas suaves y nueve torres pequeñas (almenadas o con aguja), más claras y neblinosas, detrás del castillo. Aparece primero y despacio.

## Hallazgos
- **Orden de dibujo:** three.js ordena primero por *grupo* y luego por objeto. El relleno de las letras vive en un grupo con `renderOrder` -2, así que las colinas (objeto -8, pero en un grupo con 0) se pintaban encima de las letras y las lavaban. Solución: el castillo va en un grupo con -10 y el fondo en -100.
- Las silueta y la puerta se ven correctamente a través del hueco de la D porque el castillo se dibuja detrás del relleno de las letras.

## A observar con personas
- ¿Notan que el cielo responde a su luz? ¿Se siente vivo o distrae?
- ¿La puerta de la D se lee como puerta?

## Composición del final (2026-10-15)
- El final reservaba la franja de la guía (20 % del alto) aunque la guía ya no se muestra en esa fase: dejaba un tercio inferior vacío. Ahora el castillo y la palabra usan toda la altura (la línea base sube a `finale.wordBaseline`, 0.78).
