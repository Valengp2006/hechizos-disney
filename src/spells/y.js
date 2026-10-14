// spells/y.js — Hechizo de la Y: FLORACIÓN (gesto: agarrar y soltar).
//
// Mientras se mantiene el agarre, la bifurcación de la Y se recoge en un punto de luz
// que crece (carga). Al soltar, las ramas florecen en recursión —cada rama se bifurca
// como la propia Y— y rematan en flores de luz: pétalos hechos con copias de un brazo.
// Cuanto más se mantuvo el agarre, más niveles de ramas (regla fija: tiempo -> profundidad).
// Todo sale de la Y: la bifurcación se repite reducida y repetida.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.Y):
//   nivel d de ramas crece en k = 0.05 + 0.13 d (cada uno en 0.14);
//   las flores abren al terminar su rama; al final queda todo respirando.
// Determinista: la profundidad sale de heldMs; el árbol, de ángulos y razones fijos.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createBloom(letter) {
  const cfg = CONFIG.spells;
  const { width: w, height: h } = letter.shape;
  const fork = { x: 0.5 * w, y: 0.5 * h };          // donde se juntan los brazos de la Y
  const MAXD = cfg.bloomDepthMax;

  // Árbol completo hasta la profundidad máxima; se muestra hasta `depth` según el agarre.
  const baseLen = Math.hypot(0.4 * w, 0.5 * h);       // largo de un brazo de la Y
  const baseAng = Math.atan2(0.4 * w, 0.5 * h);       // ángulo de los brazos respecto a la vertical
  const segs = [];                                     // {x0,y0,x1,y1,d,tip}
  const da = (cfg.bloomAngleDeg * Math.PI) / 180;
  const grow = (x, y, a, len, d) => {
    const x1 = x + Math.sin(a) * len, y1 = y - Math.cos(a) * len; // a=0: hacia arriba
    segs.push({ x0: x, y0: y, x1, y1, d, tip: d === MAXD });
    if (d < MAXD) {
      grow(x1, y1, a - da, len * cfg.bloomRatio, d + 1);
      grow(x1, y1, a + da, len * cfg.bloomRatio, d + 1);
    }
  };
  // Los dos brazos de la Y arrancan en la bifurcación y se bifurcan como ella.
  grow(fork.x, fork.y, -baseAng, baseLen, 1);
  grow(fork.x, fork.y, baseAng, baseLen, 1);

  const NS = segs.length;
  const line = new Float32Array(NS * 6), lineCol = new Float32Array(NS * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(line, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  lines.frustumCulled = false;
  letter.group.add(lines);

  // Flores: una por punta (a la profundidad máxima); cada pétalo es un trazo corto.
  const tips = segs.filter((s) => s.tip);
  const PET = cfg.bloomPetals;
  const pet = new Float32Array(tips.length * PET * 6), petCol = new Float32Array(tips.length * PET * 6);
  const petGeo = new THREE.BufferGeometry();
  petGeo.setAttribute('position', new THREE.BufferAttribute(pet, 3));
  petGeo.setAttribute('color', new THREE.BufferAttribute(petCol, 3));
  const petals = new THREE.LineSegments(petGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  petals.frustumCulled = false;
  letter.group.add(petals);

  // Nodos y centros de flor: puntos de luz (volumen por densidad).
  const nodes = segs.map((s) => ({ x: s.x1, y: s.y1, d: s.d, tip: s.tip }));
  const nPos = new Float32Array((nodes.length + 1) * 3), nCol = new Float32Array((nodes.length + 1) * 3);
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute('color', new THREE.BufferAttribute(nCol, 3));
  const dots = new THREE.Points(nGeo, new THREE.PointsMaterial({
    map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 11, sizeAttenuation: false,
  }));
  dots.frustumCulled = false;
  letter.group.add(dots);
  nodes.forEach((n, i) => { nPos[i * 3] = n.x; nPos[i * 3 + 1] = n.y; });
  // Último nodo: la semilla de luz en la bifurcación (carga).
  const SEED = nodes.length;
  nPos[SEED * 3] = fork.x; nPos[SEED * 3 + 1] = fork.y;
  nGeo.attributes.position.needsUpdate = true;

  let depth = cfg.bloomDepthMin;
  const tmp = new THREE.Color();
  const put = (arr, i, c, b) => { arr[i * 3] = c.r * b; arr[i * 3 + 1] = c.g * b; arr[i * 3 + 2] = c.b * b; };

  // Cuánto se mantuvo el agarre decide los niveles (de bloomDepthMin a bloomDepthMax).
  function start(trail, info) {
    const f = clamp01(((info && info.heldMs) || 0) / cfg.chargeMs);
    depth = Math.round(cfg.bloomDepthMin + (cfg.bloomDepthMax - cfg.bloomDepthMin) * f);
  }

  function clearTree() {
    lineCol.fill(0); petCol.fill(0);
    for (let i = 0; i < nodes.length; i++) put(nCol, i, letter.cAwake, 0);
    lineGeo.attributes.color.needsUpdate = true;
    petGeo.attributes.color.needsUpdate = true;
  }

  // Semilla: crece con la carga (0..1) mientras se mantiene el agarre.
  function charge(level, sec) {
    clearTree();
    const pulse = 0.75 + 0.25 * Math.sin(sec * 8);
    tmp.copy(letter.cAmber).lerp(letter.cAwake, level);
    put(nCol, SEED, tmp, level > 0.01 ? Math.min(1, 0.4 + 0.8 * level) * pulse : 0);
    nGeo.attributes.color.needsUpdate = true;
    dots.material.size = 11 + 26 * level;
  }

  // Dibuja el árbol con progreso k y brillo global.
  function drawTree(k, glow, sec) {
    let ti = 0;
    for (let i = 0; i < NS; i++) {
      const s = segs[i];
      const shown = s.d <= depth;
      const t0 = 0.05 + 0.13 * (s.d - 1);
      const g = shown ? smooth(t0, t0 + 0.14, k) : 0;
      const ex = s.x0 + (s.x1 - s.x0) * g, ey = s.y0 + (s.y1 - s.y0) * g;
      line[i * 6] = s.x0; line[i * 6 + 1] = s.y0; line[i * 6 + 2] = 0;
      line[i * 6 + 3] = ex; line[i * 6 + 4] = ey; line[i * 6 + 5] = 0;
      tmp.copy(letter.cRose).lerp(letter.cAmber, s.d / MAXD).lerp(letter.cAwake, smooth(0.8, 1, k));
      const b = glow * (g > 0 ? 0.9 : 0);
      put(lineCol, i * 2, tmp, b); put(lineCol, i * 2 + 1, tmp, b * 0.5);
      put(nCol, i, tmp, g >= 1 ? glow : 0);
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    // Flores: solo en las puntas del nivel mostrado; abren al terminar la rama.
    tips.forEach((s, ti2) => {
      const lastLevel = s.d === depth;
      const bloomT = 0.05 + 0.13 * (s.d - 1) + 0.14;
      const open = lastLevel ? smooth(bloomT, bloomT + 0.12, k) : 0;
      for (let p = 0; p < PET; p++) {
        const a = (p / PET) * Math.PI * 2 + (sec * 0.2);
        const r = 22 / letter.scale * open * (1 + 0.1 * Math.sin(sec * 2 + p));
        const o = (ti2 * PET + p) * 6;
        pet[o] = s.x1; pet[o + 1] = s.y1; pet[o + 2] = 0;
        pet[o + 3] = s.x1 + Math.cos(a) * r; pet[o + 4] = s.y1 + Math.sin(a) * r; pet[o + 5] = 0;
        tmp.copy(letter.cAmber).lerp(letter.cAwake, p / PET);
        put(petCol, ti2 * PET * 2 + p * 2, tmp, glow * open);
        put(petCol, ti2 * PET * 2 + p * 2 + 1, tmp, 0);
      }
    });
    // Los nodos de nivel no final (ya crecidos) quedan; la semilla se apaga al florecer.
    put(nCol, SEED, letter.cAwake, 0);
    petGeo.attributes.position.needsUpdate = true;
    petGeo.attributes.color.needsUpdate = true;
    nGeo.attributes.color.needsUpdate = true;
  }

  function reset() { clearTree(); put(nCol, SEED, letter.cAwake, 0); nGeo.attributes.color.needsUpdate = true; }

  function conjured(k, ms) {
    dots.material.size = 11;
    drawTree(k, smooth(0, 0.08, k), ms / 1000);
    const bump = Math.exp(-(((k - 0.05) / 0.05) ** 2));
    return {
      lineOp: smooth(0, 0.1, k),
      pointOp: 0.8 * smooth(0, 0.1, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.5, 1, k)),
      flashOp: 0.25 * bump,
      flashScale: 0.8,
    };
  }

  // Despierta: el árbol queda florecido y respira.
  function awake(ms, breath) {
    drawTree(1, 0.55 + 0.4 * breath, ms / 1000 + cfg.durationMs.Y / 1000);
  }

  return { start, charge, conjured, awake, reset };
}
