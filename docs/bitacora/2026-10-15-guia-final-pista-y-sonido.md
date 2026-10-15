# 2026-10-15 — Guía que se va, pista explícita y sonido mágico

## Guía
- **Desaparece al completar la palabra:** la barra solo existe en la fase de juego; no tapa el final.
- **Pista explícita:** tras `guide.explicitAfterMs` (18 s) en un minijuego sin avanzar (<35 %), la barra da la instrucción paso a paso ("Mueve el cursor en círculos alrededor de la campana, sin parar...") y el pictograma del gesto se dibuja grande junto a la letra. No hace nada por la persona.

## Sonido mágico (sin archivo)
- Capa sintetizada en Web Audio (`audio.js`): tañidos de celesta con parciales inarmónicos y eco con realimentación + un colchón suave de fondo.
- **Una nota por letra** en la pentatónica de Re mayor, en el orden de la palabra (Re Mi Fa# La Si Re): al despertarlas en orden suena una escala ascendente.
- Eventos:
  | Momento | Sonido |
  |---|---|
  | encender el audio | tres notas suaves ascendentes |
  | una letra nota tu luz | destello muy suave (con freno) |
  | el gesto abre el juego | dos notas que suben (la de la letra y su quinta) |
  | avance del juego (33 %, 66 %) | tañidos cada vez más agudos |
  | gesto equivocado | una nota baja y suave, sin castigo |
  | la letra despierta | arpegio ascendente tipo arpa + su nota larga |
  | contagio (saltito) | destello corto |
  | convergencia | barrido de toda la escala |
  | revelación del castillo | acorde pleno + arpegio brillante |
  | silencio del final | el colchón y la música bajan a cero |
- Parámetros: `audio.sfx.volume`, `audio.sfx.echo`, `audio.sfx.pad`, `audio.sfx.enabled`.

## Limitaciones conocidas
- No se pudo oír en el entorno de pruebas (solo se verificó que no hay errores): hay que escucharlo y ajustar volumen y eco a oído.
- Los navegadores exigen un gesto para encender el audio.

## A observar con personas
- ¿El sonido ayuda a descubrir (se nota cuándo vas bien) o distrae?
- ¿La escala ascendente al despertar en orden se percibe?

## Ajuste posterior (2026-10-15)
- **Sonido del cuento:** una nota por línea, cada vez más aguda (Re, Fa#, Si), con un destello al cerrar la última (`sfx.story`). Solo suena si el audio ya está encendido (un gesto previo o Chrome con `--autoplay-policy=no-user-gesture-required`).
- **Música en loop apagada por ahora** (`audio.music: false`): ya no se pide `loop.mp3` (desaparece el aviso 404) y suenan solo los sonidos mágicos. El código del loop queda por si se retoma.
