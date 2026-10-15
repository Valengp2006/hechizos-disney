# 2026-10-15 — La persona juega; la guía acompaña, no hace

## Principio (de Valen)
"La idea es que la persona sea quien juegue, no que se haga solo, que tenga una guía más no que lo haga por él."

## Qué se quitó
- **El cursor fantasma del mini-tutorial** que jugaba cada minijuego solo.
- **El "empujoncito"** que completaba el minijuego a los 14 s sin que la persona lo lograra.

## Qué se puso en su lugar
- **Ayuda que facilita, no completa** (`games.assist*`): tras `assistAfterMs` el reto se vuelve más permisivo (más ganancia, menos pérdida, más tolerancia, más alcance de la mecha, menos agarre mínimo). La persona sigue siendo quien lo logra.
- **La guía acompaña mientras se juega:** indicaciones vivas según el avance real: "Vas bien, sigue así" (progreso subiendo), "¡Casi! No pares" (>70 %), la pista del juego si se frena ("Si paras, se frena") y "Te lo pongo un poco más fácil" cuando la ayuda ya actúa.
- **Pictograma en escena al acercarse** (`help.nearMs` = 2.5 s): si la persona lleva un rato junto a la letra del paso actual sin abrirla, se dibuja su gesto. Muestra cómo, no lo hace.
- **Mini-tutorial** pasa a ser opcional y está desactivado: solo muestra objeto y gesto de cada letra.

## Verificación (entrada sintética)
- Abrir el juego de la D y quedarse completamente quieto 27 s: sigue "jugando con la campana", sin completarse. La guía pasa de "Vas bien" a "Si paras, se frena" y luego a "Te lo pongo un poco más fácil".

## A observar con personas
- ¿La ayuda llega a tiempo (14 s) o demasiado tarde para una exhibición?
- ¿Alguien se queda atascado indefinidamente? Si pasa, `abandonMs` lo cierra y queda la guía; considerar una pista más explícita antes.
- ¿Las indicaciones vivas se leen o se ignoran mientras se juega?
