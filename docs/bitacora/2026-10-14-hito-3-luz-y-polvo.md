# 2026-10-14 — Hito 3: punto de luz, estela y polvo

## Qué se hizo
- `input.js`: entrada unificada `{x, y, vx, vy, grab, source, active}` (solo mouse por ahora).
- `render.js`: halo suave y punto de luz con estela (halos que decaen + línea que los une).
- `dust.js`: polvo ambiental con deriva lenta, parpadeo y avivamiento cerca del punto de atención.

## Decisiones
- El azar del polvo usa una semilla fija (`visual.dustSeed`): decora, nunca decide resultados.
- El polvo se guarda en coordenadas normalizadas: al redimensionar se reparte igual.
- El punto solo aparece cuando el mouse está en la página (`active`).

## Hipótesis -> observación
- `dustOpacity` 0.16 -> hipótesis: "casi invisible". Observado: se lee como un cielo de estrellas, demasiado presente. Se baja a 0.09.
- Pendiente: observar `trailLength` 40 con mouse real; comprobar si la estela fluye o se ve rígida a baja velocidad.

## Aviso detectado
- Con el modo performance por defecto, el sitio publicado se ve negro hasta que se pulsa `M` o se usa `?dev`. Es intencional; hasta el Hito 6 las letras solo existen como debug.
