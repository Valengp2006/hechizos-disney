# 2026-10-15 — N más descubrible, guía que no tapa y sin spoilers

## Problemas vistos por Valen
1. La guía mostraba D-I-S-N-E-Y en orden y con las letras desde el inicio: **spoiler de la palabra**.
2. El zigzag de la N era difícil de descubrir.
3. La barra de la guía tapaba letras.
4. Al sistema le faltaba "un poco más de juego" (pendiente de decidir qué).

## Cambios
- **Sin spoilers:** las fichas y el mini-tutorial siguen un orden fijo que no forma la palabra (`guide.order`: E, S, D, Y, I, N). Las fichas pendientes muestran el **símbolo del gesto** y una "?"; el objeto y la letra se revelan solo cuando esa letra despierta. El texto del paso habla del objeto ("la campana"), no de la letra.
- **N: agitar el cursor.** El gesto cuenta cambios de sentido en x **o en y**, con menos exigencia: 3 cambios de 30 px (antes 4 de 40 px solo en x). Es lo que la gente hace sola al buscar. Texto de la guía: "Agita el cursor rápido".
- **Guía que no tapa:** se reserva la franja inferior (`guide.reserve` = 0.2) para la barra; letras y castillo se colocan en el alto útil. La barra es más compacta (~16 % del alto).

## Pruebas (sintéticas)
- Agitar en vertical (3 cambios) y suave (35 px): dispara. Temblor de 12 px: no dispara.
- Los seis gestos anteriores siguen disparando una sola vez.

## A observar con personas
- ¿Descubren el agitar sin guía? ¿Lo confunden con el barrido?
- ¿Se arma la palabra "sola" al despertar letras, sin que nadie se la haya mostrado?
