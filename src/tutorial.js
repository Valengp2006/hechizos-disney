// tutorial.js — mini-tutorial tras el cuento. En el orden de la guía (no el de la palabra),
// cada letra muestra su objeto (vista previa) y su gesto dibujado con luz; luego se apaga y
// sigue la siguiente.
// Todos lo ven una vez al empezar; un clic lo salta.
import { CONFIG } from './config.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createTutorial({ letters }) {
  let t0 = 0;
  let done = true;

  function clearPreview() { letters.letters.forEach((l) => { l.preview = 0; }); }
  function start(now) { t0 = now; done = false; }
  function skip() { done = true; clearPreview(); }

  // Letras en el orden de la guía (no el de la palabra: así el tutorial no adelanta DISNEY).
  const ordered = () => {
    const word = CONFIG.font.word;
    const chars = [...new Set([...CONFIG.guide.order, ...word])].filter((c) => word.includes(c));
    return chars.map((c) => letters.letters.find((l) => l.char === c)).filter(Boolean);
  };

  // Devuelve la letra en turno (o null) y actualiza su vista previa.
  function update(now) {
    if (done) return null;
    const list = ordered();
    const slot = CONFIG.tutorial.slotMs;
    const i = Math.floor((now - t0) / slot);
    if (i >= list.length) { skip(); return null; }
    const local = ((now - t0) % slot) / slot;
    letters.letters.forEach((l) => {
      l.preview = l === list[i] ? smooth(0, 0.15, local) * (1 - smooth(0.88, 1, local)) : 0;
    });
    return list[i];
  }

  return { start, skip, update, active: () => !done };
}
