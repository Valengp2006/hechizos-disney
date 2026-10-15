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
| D | círculo | campanada de luz |
| I | subir | rebote ligero |
| S | barrido horizontal | cinta de fiesta |
| N | zigzag | cascada de chispas |
| E | quedarse quieto | amanecer |
| Y | agarrar (mantener) y soltar | floración |

Cuando las seis despiertan, convergen en DISNEY, hay un silencio y aparece un castillo genérico hecho con las propias letras. Tras 30 s sin interacción, todo vuelve a la oscuridad.

## Teclas
`Tab` modo performance/dev · `D` debug (dev) · `F` pantalla completa · `R` apaga las letras (dev) · `W` despierta las seis y dispara el final (dev). También `?dev` en la URL.

## Uso

```bash
npm install --ignore-scripts   # ml5 trae un postinstall (patch-package) que no hace falta
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
