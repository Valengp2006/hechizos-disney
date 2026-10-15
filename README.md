# Hechizos

Sistema tipográfico jugable con las letras de **DISNEY**.

- **Misión:** hacer feliz a la gente (fomentar la felicidad y el bienestar de niños y familias).
- **Atributo explorado:** magia y fantasía.
- **Verbo:** *encantar*.
- **Contexto:** pantalla interactiva en un evento; público familiar e intergeneracional.
- **Entrada:** mouse (la entrada por mano está pendiente).

Contexto completo y reglas del proyecto: [AGENT.md](AGENT.md). Fuentes: [docs/referentes.md](docs/referentes.md). Bitácora: [docs/bitacora/](docs/bitacora/).

## Cómo se juega
Pantalla casi negra y un punto de luz que sigue al cursor. Las letras no se ven: cada una guarda un hechizo que se despierta con un gesto. Al acercarse, el polvo de la letra insinúa cuál es.

Cada letra se descubre en **tres tiempos**: el **gesto** la abre, un **minijuego** corto la despierta y su **hechizo** es la recompensa.

| Letra | Gesto que la abre | Minijuego | Hechizo (recompensa) |
|---|---|---|---|
| D | círculo | **hazla sonar**: da vueltas alrededor de la campana y se balancea más | portal |
| I | subir | **enciende la vela**: lleva las luciérnagas hasta la mecha con tu luz | gravedad invertida |
| S | barrido horizontal | **sigue la luz**: acompaña con el cursor a un guía que ondula por la pantalla | cinta |
| N | agitar el cursor | **agita el cielo**: sigue agitando para cargar la estrella | relámpago |
| E | quedarse quieto | **calma las cuerdas**: quieto, las cuerdas suenan una a una; moverte las espanta | faro |
| Y | agarrar (mantener) y soltar | **riega la semilla**: mantén para que crezca y suelta para que florezca | constelación-árbol |

Sin fallo ni números: el progreso se ve en la propia luz. **Quien juega es la persona**: si se atasca, tras ~14 s el reto se vuelve más permisivo (nunca se completa solo) y la guía la acompaña con indicaciones vivas; si se aleja ~7 s, el juego se cierra.

**Pantalla de inicio:** al cargar (y para cada visitante nuevo, tras el reinicio) pide un clic en "Comenzar". Ese clic enciende el audio —el navegador lo exige— y da paso al cuento. Enter o espacio también sirven. En dev se salta; `?intro` la muestra.

**Inicio de cuento:** al arrancar (y para cada visitante nuevo) una frase se traza con un lápiz de luz antes de poder jugar.

**Ayuda:** si en ~20 s no despierta ninguna letra, junto a la letra más cercana aparece un trazo de luz que dibuja su gesto (círculo, flecha hacia arriba, barrido, zigzag, anillo que respira o que se recoge).

**Encadenamientos:** los hechizos se afectan entre sí con reglas fijas (contacto → efecto):
- Si la **cinta de la S** va hacia un **portal abierto de la D**, es absorbida girando en espiral y sale dorada.
- Si la cinta cruza la **columna de la I** en gravedad invertida, la columna la levanta.
- La **chispa del relámpago de la N** pasa el relevo a la **siguiente letra de la palabra** (N → E) y la enciende un instante (en la E, destellan sus haces); si ya está despierta, la hace saltar.
- La luz del portal avisa a las letras vecinas, y cuando una letra despierta todas las despiertas parpadean juntas.

**Letras-objeto:** al despertar, cada letra se rellena y se convierte en su objeto, con color propio, iluminado por el cursor sobre la oscuridad (lejos de él queda en penumbra): **D** campana, **I** vela, **S** cinta, **N** estrella, **E** arpa, **Y** flor sobre tallo. Siguen leyéndose como letras y forman la palabra DISNEY.

**Guía siempre visible:** una barra al pie muestra los seis pasos (uno por letra, en el orden de la palabra): los despiertos, encendidos y con una marca; el actual con su gesto animado, qué hacer y dónde (la letra del paso actual **late** en la oscuridad); los pendientes, apagados. Se apaga durante el cuento y, al terminar, cuenta lo que pasa en el final.

**Mini-tutorial (opcional, desactivado):** vista previa del objeto y del gesto de cada letra; nunca juega por la persona. En dev, la tecla `T` lo lanza.

Cuando las seis despiertan, convergen en DISNEY, hay un silencio y aparece un castillo genérico hecho con las propias letras. Tras 30 s sin interacción, todo vuelve a la oscuridad.

## Teclas
`Tab` modo performance/dev · `D` debug (dev) · `F` pantalla completa · `R` apaga las letras (dev) · `W` despierta las seis y dispara el final (dev) · `H` fuerza el pictograma de ayuda (dev). En la URL: `?dev` arranca en dev y `?intro` fuerza el inicio de cuento en dev. Un clic salta la introducción.

## Uso

```bash
npm install
npm run dev                    # http://localhost:5173
npm run build                  # dist/ para GitHub Pages (se despliega solo al hacer push a main)
```

**Sonido:** lo enciende el clic de la pantalla de inicio (el navegador exige un gesto), así que ya no hace falta ninguna opción de Chrome. La música en loop está apagada por ahora (`audio.music`); suena la capa mágica sintetizada (`audio.sfx` en `config.js`), que incluye una nota por cada línea del cuento.

La cámara requiere HTTPS (o `localhost`); hoy no se usa. No se guarda ni transmite nada de ella.

## Estructura
Todos los parámetros están en `src/config.js`, con su efecto comentado.

```
src/
  main.js        arranque, escena y ciclo
  config.js      TODOS los parámetros
  font.js        fuente, contornos, muestreo de puntos
  input.js       entrada unificada {x, y, vx, vy, grab, source, active}
  gestures.js    reconocedor de gestos por trayectoria (puro y determinista)
  letter.js      letra: estados, reparto de gestos y encadenamientos
  spells/        un hechizo por letra (d, i, s, n, e, y)
  finale.js      convergencia, silencio, castillo, reposo y reinicio
  dust.js        polvo ambiental
  render.js      halo y punto de luz
  audio.js       música de fondo (Web Audio)
  mode.js        modo performance / dev
  debug.js       panel de gestos (dev)
```
