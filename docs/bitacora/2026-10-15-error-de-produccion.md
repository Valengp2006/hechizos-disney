# 2026-10-15 — Error de producción: la escena se congelaba al mover el mouse

## Lo que se vio
En la versión publicada, tras el cuento, la escena quedaba congelada en la última línea y la consola mostraba, en cada frame:
`Uncaught TypeError: x[t.name] is not a function` (408 veces).

## Causa
En el cambio de "mejor progreso entre ventanas" (`gestures.js`) se indexó una tabla con `fn.name` (el **nombre de la función**). En desarrollo funciona, pero el minificador de producción renombra las funciones (`ef`, `tf`...), así que `x[t.name]` era `undefined` y lanzaba el error en cada frame en cuanto había mouse activo.

## Por qué no se vio antes
Todas las pruebas de ese cambio se hicieron contra el servidor de desarrollo (nombres intactos) o sin mover el mouse en el build compilado.

## Corrección
- Claves explícitas (`pick('circle', measureCircle)`), sin depender de `fn.name`.
- **Red de seguridad:** el cuerpo del ciclo va en `try/catch`; si un frame falla, se registra una sola vez (`[frame]`) y el ciclo sigue (antes, un error por frame congelaba toda la escena).

## Lección / proceso
- **Probar el build de producción** (`npm run build && npx vite preview`) con interacción real (mover el mouse y hacer gestos) antes de cada subida que toque lógica. En el repo no hay pruebas automáticas de eso todavía.
- Evitar `fn.name`, `class.name` y cualquier dependencia de nombres de funciones: el minificador los cambia.
