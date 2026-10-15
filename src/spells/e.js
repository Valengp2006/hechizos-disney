// spells/e.js — Hechizo de la E: FARO (gesto: quedarse quieto).
//
// Los tres brazos de la E se alargan como haces de luz cálida y barren la oscuridad como
// el faro de un puerto, cada uno con su ritmo. El polvo que tocan se vuelve dorado y sube
// suave. Premia la calma: es el único gesto de no hacer nada.
// Todo sale de la E: cada haz nace en la punta de uno de sus brazos.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.E):
//   0.1–0.5 los haces crecen mientras barren · 0.5–0.7 plenos · 0.7–1 se recogen al 50 %
//   y quedan barriendo despacio (letra despierta).
// Determinista: el ángulo de cada haz es una onda seno con fase fija.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const frac = (v) => v - Math.floor(v);
const MOTES = 8;       // motas de luz que viajan por cada línea del haz
const TO_RAD = Math.PI / 180;

export function createLighthouse(letter) {
  const cfg = CONFIG.spells;
  const { width: w, height: h } = letter.shape;
  const R = cfg.dawnRays;

  // Tres haces, uno por brazo: arriba, centro (más corto) y abajo, con fases distintas.
  const beams = [
    { x: 0.95 * w, y: 0.07 * h, base: -28, phase: 0.0 },
    { x: 0.78 * w, y: 0.50 * h, base: 0, phase: 2.1 },
    { x: 0.95 * w, y: 0.93 * h, base: 28, phase: 4.2 },
  ];
  const NB = beams.length;
  const NR = NB * R;

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

  // growth: 0..1 del largo; glow: brillo 0..1; sec: tiempo (barrido y viaje de las motas).
  function draw(growth, glow, sec) {
    const L = (cfg.dawnRayLength * window.innerWidth) / letter.scale; // px -> unidades locales
    const sweepW = (2 * Math.PI) / (cfg.dawnSweepMs / 1000);
    for (let b = 0; b < NB; b++) {
      const bm = beams[b];
      // Ángulo del haz: oscila alrededor de su dirección base.
      const center = (bm.base + cfg.dawnSweepDeg * Math.sin(sec * sweepW + bm.phase)) * TO_RAD;
      const len = L * (b === 1 ? 0.8 : 1) * growth;
      for (let r = 0; r < R; r++) {
        const i = b * R + r;
        const spread = R > 1 ? (r / (R - 1)) * 2 - 1 : 0;
        const ang = center + spread * cfg.dawnFanDeg * TO_RAD;
        const ex = bm.x + Math.cos(ang) * len, ey = bm.y + Math.sin(ang) * len;
        seg[i * 6] = bm.x; seg[i * 6 + 1] = bm.y; seg[i * 6 + 2] = 0;
        seg[i * 6 + 3] = ex; seg[i * 6 + 4] = ey; seg[i * 6 + 5] = 0;
        tmp.copy(letter.cAmber).lerp(letter.cAwake, 0.5);
        // El haz nace brillante en el brazo y se apaga en la punta; el borde del haz es más tenue.
        const edge = 1 - 0.45 * Math.abs(spread);
        segCol[i * 6] = tmp.r * glow * edge; segCol[i * 6 + 1] = tmp.g * glow * edge; segCol[i * 6 + 2] = tmp.b * glow * edge;
        segCol[i * 6 + 3] = segCol[i * 6 + 4] = segCol[i * 6 + 5] = 0;
        const phase = frac(i * 0.6180339887);
        for (let m = 0; m < MOTES; m++) {
          const idx = i * MOTES + m;
          const s = frac(sec * 0.22 + phase + m / MOTES); // avanzan por el haz y reinician
          mPos[idx * 3] = bm.x + Math.cos(ang) * len * s;
          mPos[idx * 3 + 1] = bm.y + Math.sin(ang) * len * s;
          const bb = glow * Math.sin(Math.PI * s) * 0.8 * edge;
          mCol[idx * 3] = tmp.r * bb; mCol[idx * 3 + 1] = tmp.g * bb; mCol[idx * 3 + 2] = tmp.b * bb;
        }
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
    const grow = smooth(0.1, 0.5, k);
    const settle = 1 - 0.5 * smooth(0.7, 1, k);
    draw(grow * settle, smooth(0.05, 0.3, k), ms / 1000);
    return {
      lineOp: smooth(0, 0.15, k),
      pointOp: 0.8 * smooth(0, 0.15, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.3, 0.8, k)),
      flashOp: 0.16 * smooth(0.1, 0.5, k) * (1 - smooth(0.7, 1, k)),
      flashScale: 1.0,
      lift: smooth(0.15, 0.4, k),                                                // el polvo sube suave...
      warmth: cfg.dawnWarmth * smooth(0.15, 0.5, k) * (1 - smooth(0.85, 1, k)),  // ...y se dora
    };
  }

  // Despierta: los haces quedan al 50 % y siguen barriendo despacio, respirando.
  function awake(ms, breath) {
    draw(0.5, 0.45 + 0.4 * breath, ms / 1000 + cfg.durationMs.E / 1000);
  }

  // Contagio (la chispa de la N, la luz del portal...): los haces destellan un instante
  // aunque la E esté dormida. `level` 0..1 lo decide la letra.
  let flaring = false;
  function flare(level, sec) {
    if (level > 0.01) { draw(0.5 * level + 0.15, 0.9 * level, sec); flaring = true; }
    else if (flaring) { reset(); flaring = false; }
  }

  return { conjured, awake, reset, flare };
}
