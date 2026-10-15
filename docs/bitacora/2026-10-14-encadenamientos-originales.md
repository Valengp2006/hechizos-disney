# 2026-10-14 — Encadenamientos originales sobre los hechizos originales

## Qué se hizo
Se recuperó el encadenamiento clásico del diseño inicial y se unió al "la alegría se contagia":
1. **Cinta -> portal.** Si hay un portal abierto (D conjurada o despierta) en el sentido del barrido, la cinta de la S no hace el rizo en el aire: va al portal, entra en espiral (dos vueltas), sale por el túnel más brillante y dorada y vuelve a su sitio.
2. **Cinta -> columna de la I.** Si la cinta cruza la columna de la I en gravedad invertida, la columna la levanta (deformación hacia arriba proporcional a la cercanía a la columna y al progreso del hechizo).
3. **Chispa del relámpago -> letra vecina.** Al terminar, la chispa vuela a la letra más cercana y la aviva; en la E, los haces del faro destellan aunque duerma.
4. **Luz del portal -> vecinas** (`reach()` de la D) y **despertar colectivo** (las despiertas parpadean juntas).

## Detalles
- Los hechizos exponen su interfaz de contacto: `portal()` (D), `column()` (I), `reach()` (D), `head()` (S), `takeArrival()` (N), `flare()` (E).
- Todas las reglas son deterministas; ninguna cambia el estado de otra letra.

## Hallazgo
- El sentido del barrido se calculaba con el trazo completo y, si la persona venía de otra letra, se volteaba (la cinta salía al revés). Ahora sale del tramo final (últimos 350 ms), que es el gesto en sí.

## Pruebas (sintéticas)
- Circulo sobre la D y, con el portal abierto, barrido a la izquierda sobre la S: la cinta entra al portal y vuelve dorada.
- Gravedad de la I y barrido a la izquierda: la cinta se curva hacia arriba al cruzar la columna.

## A observar con personas
- ¿Descubren la cadena sin que se les diga? Es una recompensa para quien explora, no un requisito.
- La ventana del portal abierto dura ~4 s (`spells.durationMs.D`) y después queda una copia pequeña que sigue capturando con menos radio.
