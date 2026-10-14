# 2026-10-14 — Hito 2: tipografía y muestreo

## Qué se hizo
- Fuente provisional **Cinzel Bold** (OFL) en `public/fonts/`, con su licencia.
- `src/font.js`: carga con opentype.js, aplana los contornos (Bézier -> polilíneas) y muestrea puntos a distancia constante por longitud de arco. Es determinista.
- Modo depuración en `main.js` (tecla **D**): contorno en azul hielo, puntos en dorado.

## Decisiones
- Todo lo geométrico se mide en px y con el origen arriba a la izquierda, igual que el mouse.
- Los colores se pasan como sRGB; sin eso three.js aclara el fondo (se veía azul-violeta en vez de casi negro).

## Hipótesis / observaciones (parámetros)
- `font.sampleSpacing` 6 -> hipótesis: menos px = más puntos y más "volumen de luz". Observado: a 6 el contorno se lee como línea de puntos continua.
- Cinzel: la D y la S tienen curvas amplias, buenas para portal y cinta; la I tiene remates que pueden leerse como torre; la Y y la N tienen diagonales claras.
- Pendiente: probar Cormorant Garamond y Playfair Display y comparar con astas/remates.
