import { defineConfig } from 'vite';

// `base` relativo para que el build funcione en GitHub Pages
// (https://usuario.github.io/hechizos-disney/) sin importar el nombre del repo.
export default defineConfig({
  base: './',
});
