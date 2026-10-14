# 2026-10-14 — Modo performance/dev y música

## Qué se hizo
- `src/mode.js`: modo **performance** (público: sin debug, sin cursor) y **dev** (debug, FPS). Tecla `Tab` o `?dev`; `F` pantalla completa.
- `src/audio.js`: loop con Web Audio, arranca con el primer gesto, volumen maestro y fundidos en `config.js`.

## Decisiones
- Performance es el modo por defecto: el sistema se entrega listo para exhibición sin tocar nada.
- La música es un archivo propio/libre, loop constante; solo hay silencio real en la fase de "silencio" del final (`silence()` / `unsilence()` listos para `finale.js`).
- Sin gesto no hay sonido (restricción del navegador): se arranca con el primer click, toque o tecla, sin botón ni texto en pantalla.

## Pendiente
- Falta el archivo `public/audio/loop.mp3`. Sin él el sistema funciona en silencio y avisa por consola.
- Registrar fuente y licencia de la música en `docs/referentes.md`.
