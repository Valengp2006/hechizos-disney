# 2026-10-14 — Introducción narrativa y ayuda por luz

## Problema
Al probarlo, Valen vio que **los controles no eran claros** y que **faltaba una introducción narrativa al estilo Disney, tipo inicio de cuento**.

## Decisión (de Valen)
- **Frase tipo cuento en pantalla.** Esto rompe, a propósito, la regla 4 del encargo ("nada en pantalla explica el juego con texto") y usa letras que no son de DISNEY. Se justifica porque la frase es **narrativa, no instrucciones**: cuenta quién duerme en la oscuridad y no dice qué hacer. Queda registrada como decisión consciente para la presentación.
- **Ayuda por luz si se atasca:** pictograma, no texto.
- Se descartaron: un cuento solo con luz sin texto, la demostración permanente con la luz-invitación y el panel de ayuda oculto para el staff.

## Qué se hizo
- `src/intro.js`: tres líneas ("Había una vez…" / "una palabra dormida en la oscuridad." / "Esperaba a que alguien la hiciera sonreír.") trazadas por un lápiz de luz de izquierda a derecha con la propia tipografía (contorno y puntos). Un clic la salta. En dev se salta salvo `?intro`. Vuelve para cada visitante nuevo tras el reinicio por inactividad.
- `src/help.js`: si pasan `help.afterMs` (20 s) sin despertar ninguna letra y hay una letra cerca, se dibuja su gesto con un trazo de luz en bucle: círculo (D), flecha hacia arriba (I), barrido (S), zigzag (N), anillo que respira (E), anillo que se recoge y se suelta (Y). Se apaga al acertar.
- Durante el cuento no se aceptan gestos ni aparece la luz-invitación.
- Se corrigió que el círculo del pictograma se dibujara como una diagonal (x/y mal calculados).

## Parámetros
`intro.lines`, `intro.writeMs/holdMs/fadeMs`, `help.afterMs`, `help.opacity`, `help.sizeRatio`, `help.periodMs` en `config.js`.

## Hipótesis a comprobar con personas
- ¿La frase da ganas de explorar o se lee como instrucción? ¿Se la saltan?
- ¿El pictograma aparece a tiempo (20 s) o demasiado tarde para una exhibición? Si la gente se va antes, bajar `help.afterMs`.
- ¿Se entiende el pictograma del agarre (anillo que se recoge)?
