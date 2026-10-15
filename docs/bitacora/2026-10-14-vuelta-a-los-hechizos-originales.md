# 2026-10-14 — Vuelta a los hechizos originales, con la misión actual

## Qué pasó
- Propuse darle volumen 3D e iconos (campana, globo, cinta, estrella, sol, flor) a cada letra.
- A Valen no lo convenció: prefería el concepto anterior, donde la Y se ramifica como árbol, la D es un portal, etc.

## Decisión (de Valen)
- **Hechizos originales** (portal, gravedad invertida, cinta, relámpago, faro, constelación-árbol) con la **misión actual** (hacer feliz, magia y fantasía, verbo *encantar*) y la paleta cálida.
- La I vuelve a la **gravedad invertida**.
- Se retiran del código la "campanada de luz" (D) y el "rebote ligero" (I); quedan en el historial de git (`989544e`).

## Qué cambió
| Letra | Antes (feliz) | Ahora |
|---|---|---|
| D | campanada de luz | portal (túnel de copias del contorno, con luz que se derrama a las vecinas) |
| I | rebote ligero | gravedad invertida (cae un instante y luego sube; el polvo de toda la pantalla sube) |
| S | cinta de fiesta | igual |
| N | cascada de chispas | relámpago: descargas quebradas entre astas; la última sigue la diagonal; al final una chispa vuela a la letra vecina |
| E | amanecer | faro: haces que barren la oscuridad con ritmos distintos |
| Y | floración | igual (constelación-árbol) |

## Lectura con la misión
- Los efectos "imposibles" (portal, gravedad que se invierte, relámpago) se mantienen, pero se leen cálidos: ámbar y dorado, luz que se derrama a las vecinas y se contagia, sin dramatismo.
- Hipótesis a comprobar con personas: ¿el relámpago y el portal se leen como "magia" y no como "peligro/misterio"? Si no, bajar `boltJag` y el brillo del núcleo de la descarga.

## Parámetros
`portal*`, `rise*` (gravedad), `bolt*` (relámpago) y `dawn*` (faro) en `config.js`.
