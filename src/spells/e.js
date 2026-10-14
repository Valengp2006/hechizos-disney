// spells/e.js — Hechizo de la E: AMANECER (gesto: quedarse quieto).
//
// Los tres brazos de la E se alargan despacio como rayos de luz cálida que se abren en
// abanico. El polvo de toda la pantalla se vuelve dorado y sube suave. Premia la calma:
// es el único gesto de no hacer nada. Termina con los rayos respirando.
// Todo sale de la E: cada abanico nace en la punta de uno de sus brazos.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.E):
//   0.1–0.6 los rayos crecen · 0.6–0.7 plenos · 0.7–1 se recogen al 45 % y quedan respirando.
// Determinista: ángulo y largo de cada rayo salen de su índice.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const frac = (v) => v - Math.floor(v);
const MOTES = 8; // motas de luz que viajan por cada rayo

export function createDawn(letter) {
  const cfg = CONFIG.spells;
  const { width: w, height: h } = letter.shape;
  const R = cfg.dawnRays;

  // Tres brazos: arriba, centro (más corto) y abajo. Cada uno abre un abanico a la derecha.
  const arms = [
    { x: 0.95 * w, y: 0.07 * h, tilt: -12 },
    { x: 0.78 * w, y: 0.50 * h, tilt: 0 },
    { x: 0.95 * w, y: 0.93 * h, tilt: 12 },
  ];
  const rays = [];
  arms.forEach((a, ai) => {
    for (let r = 0; r < R; r++) {
      const spread = R > 1 ? (r / (R - 1)) * 2 - 1 : 0;
      const deg = a.tilt + spread * cfg.dawnFanDeg;
      rays.push({
        ox: a.x, oy: a.y, ang: (deg * Math.PI) / 180,
        len: 0.75 + 0.25 * Math.cos(spread * 1.3) - 0.05 * ((ai * R + r) % 3),
        phase: frac((ai * R + r) * 0.6180339887),
      });
    }
  });
  const NR = rays.length;

  const seg = new Float32Array(NR * 2 * 3), segCol = new Float32Array(NR * 2 * 3);
  const segGeo = new THREE.BufferGeometry();
  segGeo.setAttribute('position', new THREE.BufferAttribute(seg, 3));
  segGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3));
  const lines = new THREE.LineSegments(segGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  lines.frustumCulled = false;
  letter.group.add(lines);

  const mPos = new Float32Array(NR * MOTES * 3), mCol = new Float32Array(NR * MOTES * 3);
  const mGeo = new THREE.BufferGeometry();
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  mGeo.setAttribute('color', new THREE.BufferAttribute(mCol, 3));
  const motes = new THREE.Points(mGeo, new THREE.PointsMaterial({
    map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 10, sizeAttenuation: false,
  }));
  motes.frustumCulled = false;
  letter.group.add(motes);

  const tmp = new THREE.Color();

  // growth: 0..1 del largo; glow: brillo 0..1; sec: tiempo para el viaje de las motas.
  function draw(growth, glow, sec) {
    const L = (cfg.dawnRayLength * window.innerWidth) / letter.scale; // px -> unidades locales
    for (let i = 0; i < NR; i++) {
      const r = rays[i];
      const len = L * r.len * growth;
      const ex = r.ox + Math.cos(r.ang) * len, ey = r.oy + Math.sin(r.ang) * len;
      seg[i * 6] = r.ox; seg[i * 6 + 1] = r.oy; seg[i * 6 + 2] = 0;
      seg[i * 6 + 3] = ex; seg[i * 6 + 4] = ey; seg[i * 6 + 5] = 0;
      tmp.copy(letter.cAmber).lerp(letter.cAwake, 0.5);
      // El rayo nace brillante en el brazo y se apaga en la punta.
      segCol[i * 6] = tmp.r * glow; segCol[i * 6 + 1] = tmp.g * glow; segCol[i * 6 + 2] = tmp.b * glow;
      segCol[i * 6 + 3] = segCol[i * 6 + 4] = segCol[i * 6 + 5] = 0;
      for (let m = 0; m < MOTES; m++) {
        const idx = i * MOTES + m;
        const s = frac(sec * 0.18 + r.phase + m / MOTES); // avanzan por el rayo y reinician
        mPos[idx * 3] = r.ox + Math.cos(r.ang) * len * s;
        mPos[idx * 3 + 1] = r.oy + Math.sin(r.ang) * len * s;
        const b = glow * Math.sin(Math.PI * s) * 0.9;
        mCol[idx * 3] = tmp.r * b; mCol[idx * 3 + 1] = tmp.g * b; mCol[idx * 3 + 2] = tmp.b * b;
      }
    }
    segGeo.attributes.position.needsUpdate = true;
    segGeo.attributes.color.needsUpdate = true;
    mGeo.attributes.position.needsUpdate = true;
    mGeo.attributes.color.needsUpdate = true;
  }

  function reset() {
    segCol.fill(0); mCol.fill(0);
    segGeo.attributes.color.needsUpdate = true;
    mGeo.attributes.color.needsUpdate = true;
  }

  function conjured(k, ms) {
    const grow = smooth(0.1, 0.6, k);
    const settle = 1 - 0.55 * smooth(0.7, 1, k);
    draw(grow * settle, smooth(0.05, 0.3, k), ms / 1000);
    return {
      lineOp: smooth(0, 0.15, k),
      pointOp: 0.8 * smooth(0, 0.15, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.3, 0.8, k)),
      flashOp: 0.16 * smooth(0.1, 0.5, k) * (1 - smooth(0.7, 1, k)),
      flashScale: 1.0,
      lift: smooth(0.15, 0.4, k),                       // el polvo sube suave...
      warmth: cfg.dawnWarmth * smooth(0.15, 0.5, k) * (1 - smooth(0.85, 1, k)), // ...y se dora
    };
  }

  // Despierta: los rayos quedan al 45 % y respiran.
  function awake(ms, breath) {
    draw(0.45, 0.45 + 0.4 * breath, ms / 1000 + cfg.durationMs.E / 1000);
  }

  return { conjured, awake, reset };
}
