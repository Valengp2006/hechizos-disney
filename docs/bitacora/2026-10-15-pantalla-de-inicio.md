# 2026-10-15 — Pantalla de inicio

## Problema
El navegador no deja sonar nada hasta un gesto del usuario, y el cuento arrancaba antes de que nadie hiciera nada: el sonido del cuento no se oía.

## Decisión (de Valen)
Una pantalla de inicio donde haya que hacer clic para comenzar la aventura, para activar el sonido y dar paso a la narración.

## Qué se hizo
- `src/start.js`: pantalla sobre la escena con "Una aventura de luz", un botón "Comenzar" que respira y "Haz clic para encender la luz y el sonido". No nombra la palabra (no adelanta DISNEY).
- El clic llama a `unlockAudio()` (crea el AudioContext dentro del gesto) y arranca el cuento; Enter o espacio también.
- Antes de comenzar, las letras reciben una entrada inactiva (no reaccionan), la guía está oculta y la luz-invitación apagada.
- Tras el reinicio por inactividad (`start.afterReset`) vuelve la pantalla de inicio: cada visitante nuevo empieza con su clic y su cuento.
- En dev se salta (salvo `?intro`).

## Parámetros
`start.enabled`, `start.enabledInDev`, `start.afterReset`, `start.eyebrow`, `start.button`, `start.hint` en `config.js`.

## Efecto en la exhibición
- Ya no hace falta abrir Chrome con `--autoplay-policy`: el clic del inicio enciende el audio.
- Un clic por visitante: si en la exhibición no hay mouse con botón (solo mano/cámara), habrá que sustituirlo por una señal (p. ej. mantener la mano quieta un instante).

## A observar con personas
- ¿Entienden que hay que hacer clic? ¿Les llama la atención el botón?
- ¿Les molesta tener que hacer clic de nuevo tras cada reinicio?
