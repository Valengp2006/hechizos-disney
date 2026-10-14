# 2026-10-14 — Hechizos S, N, E e Y

## S: cinta de fiesta (barrido)
- Los puntos del trazo de la S, en orden, forman una cinta que sigue el sentido del barrido, ondula, da un rizo y vuelve a su sitio recomponiendo la letra. Cada punto deja ecos de luz (confeti).
- La S queda como fantasma tenue mientras tanto. Sentido derecha/izquierda según el trazo del usuario.

## N: cascada de chispas (zigzag)
- Una chispa rebota de asta a asta subiendo por la letra; cada rebote ilumina su asta como una tecla y suelta estrellitas.
- Se cambia el relámpago por la chispa que rebota: el relámpago se sentía agresivo para "hacer feliz".

## E: amanecer (quieto)
- Tres abanicos de rayos nacen de las puntas de los brazos, con motas de luz que los recorren. El polvo de la pantalla se dora y sube suave.
- Es el único gesto de "no hacer nada": premia la paciencia.

## Y: floración (agarrar y soltar)
- Mientras se mantiene el agarre, una semilla de luz crece en la bifurcación. Al soltar, las ramas se bifurcan recursivamente y rematan en flores de luz.
- Regla fija: tiempo sostenido -> niveles de ramas (`bloomDepthMin`..`bloomDepthMax`, `chargeMs` para el máximo).
- El reconocedor ahora informa cuánto duró el agarre al soltar.

## Parámetros nuevos
`ribbon*`, `spark*`, `dawn*`, `charge*`/`bloom*` en `config.js`, cada uno comentado.

## Observaciones
- Las capturas confirman que los cuatro se leen distintos entre sí (cinta, rebote, rayos, árbol).
- Pendiente con personas: que descubran que la E se activa quedándose quieta y la Y agarrando.
