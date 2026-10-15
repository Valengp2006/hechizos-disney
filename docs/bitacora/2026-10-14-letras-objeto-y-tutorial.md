# 2026-10-14 — Letras-objeto y mini-tutorial

## Origen
- Valen compartió un abecedario ilustrado (letras que *son* objetos y aun así se leen como letras) y pidió algo similar con los iconos definidos antes. También dijo que la guía seguía sin ser clara.
- De la referencia se toma solo la **idea** (letra que se convierte en objeto), no sus dibujos: ningún personaje ni silueta de marca.

## Decisiones (de Valen)
- **Estilo:** objeto iluminado sobre la oscuridad (colores propios, recortado por la luz del cursor), no ilustración plana de color ni solo luz.
- **Objetos:** D campana · I **vela** (se descartaron globo, pluma y llave) · S cinta · N estrella · E **arpa** (se descartaron sol, faro y banderines) · Y flor sobre tallo.
  - I: la vela conserva la silueta de la I y usa el lenguaje de luz; con la gravedad invertida, la cera y las chispas suben.
  - E: el sol venía del hechizo anterior ("amanecer"); el faro se descartó por poco lógico. Banderines repetían los mástiles del castillo; arpa suma una idea de cuento y sus tres "cuerdas" se leen como los haces del hechizo.
- **Guía:** mini-tutorial tras el cuento (en lugar de etiquetas de texto o solo pictograma al atascarse).

## Qué se hizo
- `src/icons.js`: el objeto es el **relleno de la propia letra** (formas con agujeros) más pocos detalles (asa y badajo, llama y soporte, estrella, cuello y clavijas, flor y hojas). Cada pieza tiene color propio y se ilumina según la cercanía del cursor (`icons.ambient`, `icons.lightRadius`). Dentro de `body`, así se estira con la I.
- En el final los objetos quedan plenamente iluminados (`alwaysLit`).
- `src/tutorial.js`: en el orden de la palabra, cada letra enseña su objeto (vista previa) y su gesto dibujado con luz (`tutorial.slotMs`). Un clic lo salta; en dev, tecla `T`.

## Hallazgos al probarlo
- Los triángulos del relleno salían con la cara al revés (el eje y va hacia abajo): `side: DoubleSide`.
- La copia del portal (un mini D girando) sobraba una vez la D es campana: se oculta cuando los objetos están activos.
- D, N y E eran demasiado parecidos en dorado: la campana pasa a cobre (`icons.colors.D`).

## A observar con personas
- ¿Se leen como letras Y como objetos? Probar a distancia de proyector.
- ¿El mini-tutorial (~14 s) es demasiado largo para una exhibición? Bajar `tutorial.slotMs`.
- ¿Entienden el orden D-I-S-N-E-Y tras el tutorial?
