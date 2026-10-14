# 2026-10-14 — Hito 6: ciclo de letra

## Qué se hizo
- `src/letter.js`: seis letras en posiciones y tamaños distintos (`letters.layout`) con los estados latente, sensible, escuchando, conjurada y despierta.
- Hechizo placeholder: destello dorado que deja la letra encendida y respirando. Los hechizos reales (Hito 7) reemplazan solo esa parte.
- Hito 5 (mano) se pospone por decisión de Valen: por ahora el sistema es solo mouse. La entrada unificada ya está lista para cuando se retome.

## Reglas
- Un gesto lo recibe la letra más cercana (latente/sensible) cuya caja esté a menos de `sensitiveRadius` del centro del trazo.
- Si el gesto es el de esa letra, conjura; si es otro, la letra escucha (se entreabre y se apaga).
- Gestos: D círculo, I subir, S barrido, N zigzag, E quieto, Y agarrar.
- Dev: tecla `R` apaga todas las letras para volver a probar; D muestra el contorno tenue de cada una.

## Observaciones
- Prueba sintética: acercar el mouse a la D la pone sensible; subir cerca de la D la hace escuchar; el círculo la conjura y queda dorada. Las otras cinco siguen latentes.
- Bug encontrado y corregido: `onModeChange` llamaba a `syncDebug` antes de declarar `letters` (zona muerta temporal) y la app no arrancaba.

## Pendiente / a observar con personas
- Gestos parciales (sin completar) todavía no hacen que la letra escuche; solo los gestos completos y equivocados.
- Posiciones y tamaños son una primera propuesta: ver si alguna letra queda tapada o muy lejos.
- Con el gesto "quieto" cerca de cualquier letra que no sea la E, la letra escucha; probar si molesta.
