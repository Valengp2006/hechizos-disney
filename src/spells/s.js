// spells/s.js — Hechizo de la S: CINTA DE FIESTA (gesto: barrido horizontal).
//
// La S se desenrolla: los puntos de su propio trazo, en orden, forman una cinta de luz
// que sigue el sentido de tu barrido, ondula, da un rizo y vuelve a su sitio para
// recomponer la letra. Cada punto deja ecos de luz (confeti) que se apagan.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.S), por punto con t en 0..1:
//   t 0–0.55 ida ondulada · 0.55–0.75 rizo · 0.75–1 vuelta y recomposición.
//   El punto j sale un poco después que el anterior (ribbonSpread): eso es la cinta.
// Determinista: el orden de los puntos, el ondulado y los ecos salen del índice.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth01 = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const smooth = (a, b, v) => smooth01((v - a) / (b - a));

export function createRibbon(letter) {
  const cfg = CONFIG.spells;
  const pts = letter.shape.points;      // en orden a lo largo del contorno
  const P = pts.length;
  const ECHOES = cfg.ribbonConfetti;
  const N = P * (1 + ECHOES);

  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const obj = new THREE.Points(geo, new THREE.PointsMaterial({
    map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 9, sizeAttenuation: false,
  }));
  obj.frustumCulled = false;
  letter.group.add(obj);

  let dir = 1;
  const tmp = new THREE.Color();

  // El gesto define el sentido: izquierda o derecha según el trazo del barrido.
  function start(trail) {
    if (trail && trail.length > 1) {
      const dx = trail[trail.length - 1].x - trail[0].x;
      dir = dx >= 0 ? 1 : -1;
    } else {
      dir = letter.pos.x < window.innerWidth / 2 ? 1 : -1;
    }
  }

  // Posición en pantalla del punto de la cinta en el instante t (0..1).
  function pathAt(t, ox, oy, W, H) {
    const D = Math.min(cfg.ribbonDistance * W, dir > 0 ? W * 0.95 - ox : ox - W * 0.05);
    const Ex = ox + dir * D, Ey = oy - 0.08 * H;
    const amp = cfg.ribbonWave * H, R = cfg.ribbonLoop * H;
    if (t < 0.55) {
      const u = t / 0.55, e = smooth01(u);
      return [ox + (Ex - ox) * e, oy + (Ey - oy) * e + amp * Math.sin(2 * Math.PI * 1.25 * u) * Math.sin(Math.PI * u)];
    }
    if (t < 0.75) {
      const v = (t - 0.55) / 0.2;
      const th = Math.PI / 2 + dir * 2 * Math.PI * v; // círculo que arranca y acaba en E
      return [Ex + R * Math.cos(th), Ey - R + R * Math.sin(th)];
    }
    const u = (t - 0.75) / 0.25, e = smooth01(u);
    return [Ex + (ox - Ex) * e, Ey + (oy - Ey) * e + amp * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u)];
  }

  function reset() {
    col.fill(0);
    geo.attributes.color.needsUpdate = true;
  }

  function conjured(k) {
    const W = window.innerWidth, H = window.innerHeight;
    const sc = letter.scale;
    const ox = letter.pos.x + (letter.shape.width / 2) * sc;
    const oy = letter.pos.y + (letter.shape.height / 2) * sc;

    for (let j = 0; j < P; j++) {
      const order = j / P;
      // Punto j: retrasado según su orden; todos terminan antes de k = 0.94.
      const base = (k - 0.04 - cfg.ribbonSpread * order) / 0.62;
      for (let e = 0; e <= ECHOES; e++) {
        const idx = j + e * P;
        const t = base - 0.03 * e;
        const alive = t > 0 && t < 1.02;
        if (!alive) { col[idx * 3] = col[idx * 3 + 1] = col[idx * 3 + 2] = 0; continue; }
        const tt = clamp01(t);
        let [sx, sy] = pathAt(tt, ox, oy, W, H);
        // Sale de su sitio original y vuelve a él: la letra se recompone.
        const bx = letter.pos.x + pts[j].x * sc, by = letter.pos.y + pts[j].y * sc;
        const leave = smooth(0, 0.1, tt), land = smooth(0.85, 1, tt);
        sx = bx + (sx - bx) * leave * (1 - land);
        sy = by + (sy - by) * leave * (1 - land);
        if (e > 0) { // confeti: el eco se desvía un poco, siempre igual para el mismo punto
          sx += Math.sin(j * 12.9898 + e) * 7;
          sy += Math.cos(j * 78.233 + e) * 7;
        }
        pos[idx * 3] = (sx - letter.pos.x) / sc;
        pos[idx * 3 + 1] = (sy - letter.pos.y) / sc;
        const bright = (e === 0 ? 0.95 : 0.45 / e) * smooth(0, 0.06, tt);
        tmp.copy(letter.cRose).lerp(letter.cAmber, order).lerp(letter.cAwake, smooth(0.85, 1, tt));
        col[idx * 3] = tmp.r * bright; col[idx * 3 + 1] = tmp.g * bright; col[idx * 3 + 2] = tmp.b * bright;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    // La letra "ya desenrollada" queda como un fantasma tenue y vuelve al final.
    const ghost = 0.12;
    const op = ghost + (1 - ghost) * (1 - smooth(0, 0.08, k) + smooth(0.82, 1, k));
    return {
      lineOp: Math.min(1, op),
      pointOp: 0.8 * Math.min(1, op),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.8, 1, k)),
      flashOp: 0.2 * Math.exp(-(((k - 0.9) / 0.05) ** 2)),
      flashScale: 0.8,
    };
  }

  function awake() {
    col.fill(0);
    geo.attributes.color.needsUpdate = true;
  }

  return { start, conjured, awake, reset };
}
