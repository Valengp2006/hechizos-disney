# 2026-10-14 — Hechizo D: portal

## Qué se hizo
- `src/spells/d.js`: el contorno de la D se repite hacia un punto de fuga dentro de su panza (copias escaladas y giradas), cae sin parar y se recoge dejando una copia pequeña girando.
- `letter.js` ahora delega la conjuración en el hechizo de la letra si existe; las demás siguen con el destello placeholder.

## Decisiones
- Túnel **hacia adentro** (no hacia el jugador): es "entrar en una letra y encontrar un túnel" y no tapa las otras letras.
- Queda una copia pequeña girando: señal de que algo imposible ocurrió ahí.
- Determinista: escala = `portalScaleStep^profundidad`, giro = `portalTwistDeg * profundidad`. No hay azar.

## Parámetros y qué esperar
- `portalCopies` 12: más = túnel más denso (y más costo).
- `portalScaleStep` 0.78: subir a 0.85 alarga el túnel; bajar a 0.6 lo acorta y lo vuelve abrupto.
- `portalTwistDeg` 14: subir lo vuelve espiral; 0 lo deja concéntrico.
- `portalFlow` 3: copias por segundo que caen; más = más sensación de caída.
- `portalCenter` / `portalRemnantScale` / `portalRemnantSpinDeg`: punto de fuga y copia final.

## Observaciones
- Con 12 copias la zona del punto de fuga acumula brillo (luz aditiva): se bajó la opacidad por copia 0.9 -> 0.7 y el destello 0.7 -> 0.45.
- Pendiente: ver con personas si el túnel se lee como "portal" o como "remolino".
