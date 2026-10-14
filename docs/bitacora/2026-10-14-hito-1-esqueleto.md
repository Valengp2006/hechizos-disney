# 2026-10-14 — Hito 1: repo y esqueleto

## Qué se hizo
- Proyecto Vite + three.js + opentype.js + ml5, canvas oscuro a pantalla completa.
- `src/config.js` con todos los parámetros, comentados.

## Decisiones
- **Cambio de concepto:** se partió de "dar vida a lo inanimado / cuidar" y se pasó a "hacer posible lo imposible / conjurar", porque la primera mecánica se sentía de gestión y no mágica, y lo buscado era asombro.
- **Cambio de motor:** se partió de p5 y se pasó a three.js por decisión de Valen (más control de luz aditiva, partículas y bloom).
- ml5 se instala con `--ignore-scripts`: su postinstall exige `patch-package`, que no está disponible.

## Observaciones
- (pendiente: completar tras probar en el navegador)
