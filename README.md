# Hechizos

Sistema tipográfico jugable con las letras de **DISNEY**. Atributo explorado: *hacer posible lo imposible*. Verbo: *conjurar*. Entradas: mouse y mano con cámara.

Contexto completo y reglas del proyecto: [AGENT.md](AGENT.md).

## Uso

```bash
npm install --ignore-scripts   # ml5 trae un postinstall (patch-package) que no hace falta
npm run dev                    # http://localhost:5173
npm run build                  # dist/ para GitHub Pages
```

La cámara requiere HTTPS (o `localhost`). No se guarda ni transmite nada de la cámara.

## Estructura

Todos los parámetros están en `src/config.js`. Bitácora en `docs/bitacora/`.
