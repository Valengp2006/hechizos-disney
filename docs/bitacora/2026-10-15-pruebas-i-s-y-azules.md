# 2026-10-15 — Primeras pruebas con personas: fallos en la I y la S, y tonos azules

## Lo que se reportó
- **La I y la S presentaron fallos** durante la prueba (síntoma exacto sin detallar).
- Recomendaron usar **tonos más azules**, característicos de Disney.

## Causas probables encontradas y corregidas
1. **El "agitar" relajado le ganaba al barrido y al subir.** Con 3 cambios de sentido de 30 px en cualquier eje, un barrido con un vaivén vertical normal (~38 px) se reconocía como *agitar* y la S "escuchaba" en vez de abrirse. Corrección: los trazos rectos (barrido, subir) se evalúan **antes** que agitar, y agitar exige moverse "en el sitio" (`zigzag.minPathRatio` = 2.2: recorrido total / desplazamiento neto).
2. **Empate entre letras cercanas:** cuando un gesto caía cerca de dos letras a la vez, ganaba la última de la lista, no la que correspondía al gesto. Corrección: si alguna letra candidata tiene justo el gesto que se hizo (medido donde termina el trazo), esa se abre; si no, la más cercana escucha.
3. **Luciérnagas de la I fuera de alcance:** podían nacer o irse por debajo de la zona alcanzable (tapadas por la franja de la guía). Ahora nacen y se quedan en la zona útil.

## Paleta azul
- Cielo en azul marino -> azul real -> azul-violeta cálido, con un resplandor dorado como contraste (el dorado y el azul son la pareja clásica).
- Castillo en azul profundo con ventanas doradas; capa lejana en azul neblinoso.
- Objetos: cinta azul real, estrella azul hielo, flor con tallo verde-azulado; campana cobre, vela crema y arpa dorada se mantienen como contraste cálido.
- Guía y pantalla de inicio sobre azul marino con filo dorado.

## Pendiente: reproducir el fallo real
- No pude reproducir exactamente lo visto en la prueba. Para cerrar el caso necesito: qué gesto hacía la persona, si la letra reaccionó ("escuchó"), si abrió el juego pero no avanzaba, o si no pasó nada.
- Para la próxima prueba: grabar la pantalla y anotar el panel de gestos (modo dev, tecla D) mientras la persona juega.

## Segunda ronda: lo que realmente pasó en la prueba (relato de Valen)
> "La persona movía la S hacia los lados y no ocurría nada; tardó mucho, y para lograrlo tuvimos que aumentar bastante la velocidad del gesto. Luego intentó pasarse a la I pero el tutorial seguía insistiendo en la S; solo tras activar la S se pudo seguir con la I, moviendo de arriba a abajo con más velocidad para que lo reconociera."

## Diagnóstico (los tres son de diseño, no un bug suelto)
1. **Dependía de la velocidad.** El barrido exigía >= 240 px en < 1 s y subir 160 px en < 1 s; un movimiento "normal" no llegaba. Además la letra no daba ninguna señal de ir bien.
2. **Frotar no contaba.** La gente mueve el cursor de lado a lado (S) o arriba y abajo (I) repetidamente; eso es "agitar" en un solo eje y solo abría la N.
3. **Un juego abierto retenía todo.** La guía seguía en la letra con juego abierto, y los gestos de otras letras se ignoraban mientras tanto; había que completar la S o esperar 7 s.

## Correcciones
- **Reconocimiento independiente de la velocidad:** ventanas hasta 2.4 s (`windowFractions` [2.4, 1.6, 1, 0.7, 0.45, 0.3]); los trazos lentos (>= 0.7 s) usan umbrales más bajos (barrido 170 px, subir 120 px) y los breves siguen exigiendo el umbral estricto (x1.5) para que el primer cuarto de un círculo no pase por recto.
- **Subir también hacia abajo:** cuenta el trazo vertical en cualquier sentido; la guía dice "Sube y baja en línea recta".
- **Frotar abre la letra de su eje:** `Letter.accepts`: la S acepta agitar de lado a lado; la I, arriba y abajo; la N, cualquier eje. Se mide el eje dominante del agitar.
- **Progreso del gesto en la mejor ventana:** la letra se entreabre mientras se hace bien el gesto, aunque sea lento.
- **Un círculo en marcha no se confunde** con un trazo recto ni con agitar (si su progreso es alto, esos esperan).
- **Pasar a otra letra:** un gesto junto a otra letra cierra el juego abierto y abre esa; la guía pasa a la letra pendiente a la que la persona se acerca; el juego se abandona tras 2.5 s alejado (antes 7 s) a 1.4 x `sensitiveRadius` (antes 2.2).

## Verificación (entrada sintética, escena de la prueba)
- Frotar de lado a lado sobre la S a ritmo normal: abre el juego ("jugando con la cinta").
- Al acercarse a la I con el juego de la S abierto: la guía cambia a "ahora: la vela".
- Frotar arriba y abajo sobre la I: abre la vela y cierra el juego de la S.
- Casos de `gtest`: barrido lento de 2 s (200 px), subir lento de 1.8 s, círculo lento de 2 s, frotar x3 y los casos anteriores siguen pasando.

## A observar con personas
- ¿Algún gesto sigue sin reconocerse a su ritmo natural? Anotar la velocidad y la letra.
- ¿La guía sigue a la persona sin que haya que "salir" de nada?
- ¿Se confunden la S, la I y la N entre sí al frotar cerca de varias a la vez?
