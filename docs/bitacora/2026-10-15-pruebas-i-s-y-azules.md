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
