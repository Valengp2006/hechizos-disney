// tutorial.js — mini-tutorial tras el cuento. En el orden de la guía (no el de la palabra),
// cada letra pasa por dos momentos:
//   open  muestra su objeto (vista previa) y el gesto que la abre, dibujado con luz;
//   play  su minijuego corre solo, jugado por un cursor fantasma, para ver qué se hace.
// Todos lo ven una vez al empezar; un clic lo salta.
import { CONFIG } from './config.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createTutorial({ letters }) {
  let t0 = 0;
  let done = true;
  let current = null;                 // letra en turno
  const input = { x: 0, y: 0, vx: 0, vy: 0, grab: false, active: true, source: 'demo' };
  let lastT = 0;

  function clearAll() {
    letters.letters.forEach((l) => { l.preview = 0; l.stopDemo(); });
    current = null;
  }
  function start(now) { clearAll(); t0 = now; done = false; lastT = now; }
  function skip() { done = true; clearAll(); }

  // Letras en el orden de la guía (no el de la palabra: así el tutorial no adelanta DISNEY).
  const ordered = () => {
    const word = CONFIG.font.word;
    const chars = [...new Set([...CONFIG.guide.order, ...word])].filter((c) => word.includes(c));
    return chars.map((c) => letters.letters.find((l) => l.char === c)).filter(Boolean);
  };

  // Posición del cursor fantasma según la letra y el tiempo (s) desde que empezó su juego.
  function script(l, tt) {
    const sc = l.scale, w = l.shape.width, h = l.shape.height;
    const [cx, cy] = l.toScreen(0.5 * w, 0.5 * h);
    input.grab = false;
    switch (l.char) {
      case 'D': { // da vueltas alrededor de la campana
        const R = 0.6 * Math.max(w, h) * sc + 34, a = tt * 3.4 - Math.PI / 2;
        return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
      }
      case 'I': { // junta luciérnagas abajo y las sube a la mecha, en ciclos de 2.8 s
        const u = (tt % 2.8) / 2.8;
        const [bx, by] = l.toScreen(0.5 * w, 1.6 * h);
        const [wx, wy] = l.toScreen(0.5 * w, -0.04 * h);
        if (u < 0.4) return [bx + Math.sin(u * 30) * 22, by + Math.cos(u * 21) * 14];
        const k = (u - 0.4) / 0.6;
        return [bx + (wx - bx) * k, by + (wy - by) * k];
      }
      case 'S': { // sigue exactamente al guía de la cinta
        const p = l.game && l.game.leader && l.game.leader();
        return p || [cx, cy];
      }
      case 'N': // agita
        return [cx + Math.sin(tt * 10) * 62, cy + Math.cos(tt * 7) * 8];
      case 'E': // quieto
        return [cx, cy];
      case 'Y': { // mantiene 1.5 s y suelta
        input.grab = (tt % 3.2) < 1.5;
        return [cx, cy];
      }
      default: return [cx, cy];
    }
  }

  // Devuelve { letter, phase: 'open'|'play', ghost: {x,y}|null } o null si no hay tutorial.
  function update(now) {
    if (done) return null;
    const list = ordered();
    const C = CONFIG.tutorial;
    const slot = C.openMs + C.playMs + C.gapMs;
    const i = Math.floor((now - t0) / slot);
    if (i >= list.length) { skip(); return null; }
    const l = list[i];
    const local = (now - t0) - i * slot;
    if (current !== l) { clearAll(); current = l; }

    if (local < C.openMs) {
      // Objeto y gesto: la vista previa entra y se queda.
      l.preview = smooth(0, 350, local);
      return { letter: l, phase: 'open', ghost: null };
    }
    const into = local - C.openMs;
    if (into >= C.playMs) {
      l.preview = 0; l.stopDemo();
      return { letter: l, phase: 'play', ghost: null };    // pausa entre letras
    }
    if (!l.demo) l.startDemo(input);
    l.preview = 0.2;
    const tt = into / 1000;
    const [x, y] = script(l, tt);
    const dt = Math.max(1, now - lastT) / 1000;
    input.vx = (x - input.x) / dt; input.vy = (y - input.y) / dt;
    input.x = x; input.y = y;
    lastT = now;
    return { letter: l, phase: 'play', ghost: { x, y } };
  }

  return { start, skip, update, active: () => !done };
}
