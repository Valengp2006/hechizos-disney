# 2026-10-14 — Guía siempre visible

## Problema
Aun con el cuento, el pictograma por atasco y el mini-tutorial, Valen siguió viendo la guía poco clara. Pidió que **esté todo el tiempo**, para saber qué hacer en cada paso.

## Decisión consciente
- Una guía permanente con texto contradice la regla 4 del encargo ("nada en pantalla explica el juego con texto"). Valen la prioriza por claridad en una exhibición. Queda registrada junto con el cuento (también texto).
- Para la presentación: el orden sigue siendo jugar primero y explicar después; la guía es una ayuda del propio objeto, no una explicación de la intención (marca, atributo, contexto).

## Qué se hizo
- `src/guide.js`: barra HTML al pie con seis fichas (una por letra, con su objeto en pequeño) y un bloque con el **paso actual**: gesto animado (punto de luz recorriendo el trazo), una frase de qué hacer, el conteo "N de 6 despiertas · ahora X (objeto)" y una pista de dónde.
- Paso actual = la pendiente más cercana al cursor; si no hay, la primera pendiente de la palabra; durante el mini-tutorial, la letra en turno.
- **La letra del paso actual late** en la oscuridad (`letters.beacon`: polvo más vivo y un fantasma tenue): sin esto la guía decía qué hacer pero no dónde, porque las letras empiezan invisibles.
- Durante el final la barra cuenta lo que pasa y en reposo avisa que volverá a dormir.
- Con la guía activa, el pictograma en escena por atasco se desactiva (queda solo el del tutorial).
- Parámetros: `guide.enabled`, `guide.beacon`, `guide.beaconStrength`, `guide.beaconGhost` y los textos de `guide.steps` en `config.js`.

## A observar con personas
- ¿La gente lee la barra o la ignora? ¿Entienden "la letra que late"?
- ¿Se siente invasiva sobre el trabajo de luz? Si es así, bajar su opacidad o mostrar solo el paso actual.
- ¿Les quita la sorpresa de descubrir? Comparar con una versión sin guía como parte de la prueba.
