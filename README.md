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

| Letra | Gesto | Hechizo |
|---|---|---|
| D | círculo | **portal**: el contorno se repite hacia el fondo como un túnel de luz |
| I | subir | **gravedad invertida**: el asta se estira y suelta polvo que cae un instante y luego sube |
| S | barrido horizontal | **cinta**: se desenrolla y nada por la pantalla siguiendo el barrido |
| N | zigzag | **relámpago**: descargas quebradas saltan entre las astas y por la diagonal |
| E | quedarse quieto | **faro**: los brazos se alargan en haces que barren la oscuridad |
| Y | agarrar (mantener) y soltar | **constelación-árbol**: la bifurcación se repite y florece |

**Inicio de cuento:** al arrancar (y para cada visitante nuevo) una frase se traza con un lápiz de luz antes de poder jugar.

**Ayuda:** si en ~20 s no despierta ninguna letra, junto a la letra más cercana aparece un trazo de luz que dibuja su gesto (círculo, flecha hacia arriba, barrido, zigzag, anillo que respira o que se recoge).

**Encadenamientos:** los hechizos se afectan entre sí con reglas fijas (contacto → efecto):
- Si la **cinta de la S** va hacia un **portal abierto de la D**, es absorbida girando en espiral y sale dorada.
- Si la cinta cruza la **columna de la I** en gravedad invertida, la columna la levanta.
- La **chispa del relámpago de la N** pasa el relevo a la **siguiente letra de la palabra** (N → E) y la enciende un instante (en la E, destellan sus haces); si ya está despierta, la hace saltar.
- La luz del portal avisa a las letras vecinas, y cuando una letra despierta todas las despiertas parpadean juntas.

Cuando las seis despiertan, convergen en DISNEY, hay un silencio y aparece un castillo genérico hecho con las propias letras. Tras 30 s sin interacción, todo vuelve a la oscuridad.

## Teclas
`Tab` modo performance/dev · `D` debug (dev) · `F` pantalla completa · `R` apaga las letras (dev) · `W` despierta las seis y dispara el final (dev) · `H` fuerza el pictograma de ayuda (dev). En la URL: `?dev` arranca en dev y `?intro` fuerza el inicio de cuento en dev. Un clic salta la introducción.

## Uso

```bash
npm install
npm run dev                    # http://localhost:5173
npm run build                  # dist/ para GitHub Pages (se despliega solo al hacer push a main)
```

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
