// tutorial.js — vista previa opcional tras el cuento. En el orden de la guía (no el de la
// palabra), cada letra muestra su objeto y el gesto que la abre, dibujado con luz.
// NUNCA juega por la persona: es una guía, no una demostración. Está desactivado por defecto
// (tutorial.enabled); la guía fija y el pictograma al acercarse ya acompañan cada paso.
// Un clic lo salta.
import { CONFIG } from './config.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createTutorial({ letters }) {
  let t0 = 0;
  let done = true;
  let current = null;

  function clearAll() { letters.letters.forEach((l) => { l.preview = 0; }); current = null; }
  function start(now) { clearAll(); t0 = now; done = false; }
  function skip() { done = true; clearAll(); }

  // Letras en el orden de la guía (no el de la palabra: así el tutorial no adelanta DISNEY).
  const ordered = () => {
    const word = CONFIG.font.word;
    const chars = [...new Set([...CONFIG.guide.order, ...word])].filter((c) => word.includes(c));
    return chars.map((c) => letters.letters.find((l) => l.char === c)).filter(Boolean);
  };

  // Devuelve { letter } de la letra en turno o null.
  function update(now) {
    if (done) return null;
    const list = ordered();
    const C = CONFIG.tutorial;
    const slot = C.openMs + C.gapMs;
    const i = Math.floor((now - t0) / slot);
    if (i >= list.length) { skip(); return null; }
    const l = list[i];
    if (current !== l) { clearAll(); current = l; }
    const local = (now - t0) - i * slot;
    l.preview = smooth(0, 300, local) * (1 - smooth(C.openMs - 250, C.openMs, local));
    return { letter: l, phase: 'open' };
  }

  return { start, skip, update, active: () => !done };
}
