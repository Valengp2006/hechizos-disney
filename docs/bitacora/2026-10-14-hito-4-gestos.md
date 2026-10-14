# 2026-10-14 — Hito 4: reconocedor de gestos

## Qué se hizo
- `src/gestures.js`: reconocedor puro y determinista sobre la trayectoria de la última ventana (círculo, subir, barrido, zigzag, quieto, agarrar/soltar).
- `src/debug.js`: panel dev (tecla D) con la trayectoria y las métricas de cada gesto contra su umbral.
- Cada gesto reconocido llega a `onGesture(name)` en `main.js`; ahí se conectarán las letras (Hito 6).

## Reglas
- Círculo: ángulo acumulado >= 300° alrededor del centro de la caja, desv. del radio <= 0.35 y radio medio >= 30 px.
- Subir / barrido: recorrido neto mínimo, poco ancho (o alto) y poco vaivén (`minStraightness`).
- Zigzag: cambios de sentido en x con histéresis de 40 px (el temblor no suma).
- Quieto: velocidad media <= 12 px/s durante 1.2 s. Agarrar: pellizco/click sostenido >= 250 ms antes de soltar.
- Prioridad: grab, still, circle, zigzag, sweep, rise. Un círculo también invierte x, por eso va antes del zigzag.

## Hipótesis -> observación
- Hipótesis: tras disparar un gesto basta con vaciar la ventana. Observado: **un círculo disparaba dos veces** porque la trayectoria seguía acumulándose durante el enfriamiento y la segunda mitad volvía a pasar el umbral. Corregido: no se acumula durante `cooldownMs`.
- Pruebas sintéticas (sin humano): círculo, subir, barrido, zigzag, quieto y agarrar disparan una vez; temblor de 3 px, bajar, quieto corto y agarre corto no disparan.
- Pendiente: probar con mouse real y ajustar. Posible fricción: el círculo debe cerrarse en < 1 s (`windowMs`).
