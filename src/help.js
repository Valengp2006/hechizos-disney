// help.js — ayuda por luz: si la persona se atasca, junto a la letra más cercana se dibuja
// el gesto con un trazo de luz que lo recorre en bucle. No es texto: es el propio gesto,
// dibujado con el mismo lenguaje de luz del juego. Desaparece al acertar o al alejarse.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haloTexture, rgb } from './render.js';

const N = 48;      // puntos que dibujan la forma del gesto
const ECHOES = 7;  // estela del lápiz de luz

// Forma de cada gesto: s en 0..1 -> (x, y) en [-1, 1] (y crece hacia abajo, como la pantalla).
const tri = (s) => Math.abs(((s % 1) + 1) % 1 * 2 - 1);
const SHAPES = {
  // Círculo en sentido horario, empezando arriba (x = sen, y = -cos porque y crece hacia abajo).
  circle: (s) => [Math.sin(2 * Math.PI * s) * 0.8, -Math.cos(2 * Math.PI * s) * 0.8],
  rise: (s) => [0, 0.8 - 1.6 * s],
  sweep: (s) => [-0.8 + 1.6 * s, 0],
  zigzag: (s) => [-0.8 + 1.6 * s, (tri(s * 4) - 0.5) * 0.9],
  still: () => [0, 0],                       // quieto: un anillo que respira (ver abajo)
  grab: () => [0, 0],                        // agarrar: un anillo que se recoge y se suelta
};

export function createHelp({ scene }) {
  const H = CONFIG.help;
  const cAmber = rgb(CONFIG.visual.colors.amber);
  const cGold = rgb(CONFIG.visual.colors.awake);
  const total = N + ECHOES + 3; // forma + estela + 3 puntos de la flecha
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const obj = new THREE.Points(geo, new THREE.PointsMaterial({
    map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 9, sizeAttenuation: false,
  }));
  obj.frustumCulled = false;
  obj.visible = false;
  scene.add(obj);

  let level = 0; // 0..1 suavizado: aparece y se va con calma
  let lastLetter = null;

  function update(now, dtMs, letter, show, opts = {}) {
    // Al cambiar de letra el pictograma reaparece desde cero (no "salta" de una a otra).
    if (letter !== lastLetter) { level = 0; lastLetter = letter; }
    level += ((show && letter ? 1 : 0) - level) * Math.min(1, (dtMs / 1000) * 3);
    if (level < 0.01 || !letter) { obj.visible = false; return; }
    obj.visible = true;

    const W = window.innerWidth, Hh = window.innerHeight;
    const R = H.sizeRatio * Math.min(Hh, W * 0.75) * (opts.big ? 1.55 : 1);
    const cx = letter.pos.x + (letter.shape.width * letter.scale) / 2;
    const cy = letter.pos.y + (letter.shape.height * letter.scale) / 2;
    const u = (now % H.periodMs) / H.periodMs;
    const kind = letter.gesture;
    const shape = SHAPES[kind];
    const op = Math.min(1, H.opacity * (opts.big ? 1.5 : 1)) * level;
    const set = (i, x, y, b, c) => {
      pos[i * 3] = x; pos[i * 3 + 1] = y;
      col[i * 3] = c.r * b * op; col[i * 3 + 1] = c.g * b * op; col[i * 3 + 2] = c.b * b * op;
    };

    if (kind === 'still' || kind === 'grab') {
      // Anillo: respira (quieto) o se recoge hasta el punto y se abre (agarrar y soltar).
      const k = kind === 'still'
        ? 0.55 + 0.25 * Math.sin(u * Math.PI * 2)
        : 1 - 0.8 * Math.sin(Math.min(1, u * 1.6) * Math.PI / 2) * (u < 0.62 ? 1 : 1 - (u - 0.62) / 0.38);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        set(i, cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k, 0.55, cAmber);
      }
      for (let e = 0; e < ECHOES; e++) set(N + e, cx, cy, 0, cAmber);
      set(N + ECHOES, cx, cy, kind === 'grab' ? 1 : 0.4, cGold); // punto central
      set(N + ECHOES + 1, cx, cy, 0, cGold);
      set(N + ECHOES + 2, cx, cy, 0, cGold);
    } else {
      // Trazo: la forma del gesto, tenue, y un lápiz de luz que la recorre dejando estela.
      for (let i = 0; i < N; i++) {
        const [x, y] = shape(i / (N - 1));
        set(i, cx + x * R, cy + y * R, 0.35, cAmber);
      }
      for (let e = 0; e < ECHOES; e++) {
        const s = Math.max(0, u - e * 0.018);
        const [x, y] = shape(s);
        set(N + e, cx + x * R, cy + y * R, e === 0 ? 1 : 0.7 * (1 - e / ECHOES) ** 1.5, e === 0 ? cGold : cAmber);
      }
      // Punta de flecha en el extremo final (da el sentido del gesto).
      const [ex, ey] = shape(1);
      const [px, py] = shape(0.94);
      const ang = Math.atan2(ey - py, ex - px);
      for (let k = 0; k < 3; k++) {
        const a = ang + Math.PI + (k - 1) * 0.55;
        const l = kind === 'circle' || kind === 'zigzag' ? 0.22 : 0.26;
        set(N + ECHOES + k, cx + (ex + Math.cos(a) * l) * R, cy + (ey + Math.sin(a) * l) * R, k === 1 ? 0 : 0.7, cGold);
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return { update };
}
