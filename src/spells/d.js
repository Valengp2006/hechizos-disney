// spells/d.js — Hechizo de la D: CAMPANADA DE LUZ (gesto: círculo).
//
// La D se alegra: su contorno se repite hacia afuera en ondas, como el eco de una
// campana, y de su panza salen luciérnagas que se reparten en espiral y se quedan
// revoloteando. Todo sale de la D: su contorno repetido y puntos de su propio trazo.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.D):
//   cada onda nace en k = i * bellStagger y vive bellRingLife; las luciérnagas salen
//   escalonadas y llegan a su sitio de reposo; la letra queda dorada y respirando.
// Determinista: ángulo, radio, retraso y fase de cada luciérnaga salen de su índice.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const GOLDEN = 0.61803398875;
const frac = (v) => v - Math.floor(v);

export function createBell(letter) {
  const cfg = CONFIG.spells;
  const { contours, points, width: w, height: h } = letter.shape;
  const cx = w / 2, cy = h / 2;
  const durSec = cfg.durationMs.D / 1000;

  // Contorno compartido, centrado: cada onda escala sobre el centro de la letra.
  const lineGeos = contours.map((c) => {
    const pts = c.points.map((p) => new THREE.Vector3(p.x - cx, p.y - cy, 0));
    if (c.closed) pts.push(pts[0].clone());
    return new THREE.BufferGeometry().setFromPoints(pts);
  });
  const pointGeo = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => new THREE.Vector3(p.x - cx, p.y - cy, 0)),
  );

  const group = new THREE.Group();
  letter.group.add(group);

  const rings = Array.from({ length: cfg.bellRings }, () => {
    const lineMat = new THREE.LineBasicMaterial({
      color: letter.cRose, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pointMat = new THREE.PointsMaterial({
      map: haloTexture(), color: letter.cRose, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 5, sizeAttenuation: false,
    });
    const g = new THREE.Group();
    lineGeos.forEach((geo) => g.add(new THREE.Line(geo, lineMat)));
    g.add(new THREE.Points(pointGeo, pointMat));
    g.position.set(cx, cy, 0);
    g.visible = false;
    group.add(g);
    return { g, lineMat, pointMat };
  });

  // Luciérnagas: nacen en el hueco de la D y se reparten en espiral alrededor.
  const F = cfg.fireflyCount;
  const start = new Float32Array(F);   // fracción de la duración en que salen
  const angle0 = new Float32Array(F);
  const radius = new Float32Array(F);  // alcance de reposo (fracción del semitamaño)
  const phase = new Float32Array(F);
  const tone = new Float32Array(F);    // 0..1: ámbar -> dorado
  for (let i = 0; i < F; i++) {
    start[i] = 0.05 + 0.4 * (i / F);
    angle0[i] = frac(i * GOLDEN) * Math.PI * 2;
    radius[i] = 0.55 + 0.7 * frac(i * 0.7548776662);
    phase[i] = frac(i * 0.5698402909) * Math.PI * 2;
    tone[i] = frac(i * 0.3247179572);
  }
  const fpos = new Float32Array(F * 3);
  const fcol = new Float32Array(F * 3);
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
  const flies = new THREE.Points(
    fgeo,
    new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 17, sizeAttenuation: false,
    }),
  );
  flies.frustumCulled = false;
  group.add(flies);

  const tmp = new THREE.Color();

  function updateFlies(k, sec) {
    for (let i = 0; i < F; i++) {
      const p = clamp01((k - start[i]) / 0.35);
      const e = 1 - (1 - p) ** 3; // sale rápido y se asienta despacio
      const a = angle0[i] + cfg.fireflyTurns * Math.PI * 2 * e;
      const wob = 5 / letter.scale;
      fpos[i * 3] = cx + Math.cos(a) * radius[i] * w * 0.75 * e + Math.sin(sec * 0.9 + phase[i]) * wob;
      fpos[i * 3 + 1] = cy + Math.sin(a) * radius[i] * h * 0.6 * e + Math.cos(sec * 1.1 + phase[i]) * wob;
      const twinkle = 0.55 + 0.45 * Math.sin(sec * cfg.fireflyTwinkleHz * Math.PI * 2 + phase[i]);
      const b = smooth(0, 0.1, p) * twinkle * 1.3;
      tmp.copy(letter.cAmber).lerp(letter.cAwake, tone[i]);
      fcol[i * 3] = tmp.r * b; fcol[i * 3 + 1] = tmp.g * b; fcol[i * 3 + 2] = tmp.b * b;
    }
    fgeo.attributes.position.needsUpdate = true;
    fgeo.attributes.color.needsUpdate = true;
  }

  function hideRings() {
    rings.forEach((r) => { r.g.visible = false; r.lineMat.opacity = 0; r.pointMat.opacity = 0; });
  }

  function reset() {
    hideRings();
    fcol.fill(0);
    fgeo.attributes.color.needsUpdate = true;
  }

  function conjured(k, ms) {
    const sec = ms / 1000;
    rings.forEach((r, i) => {
      const p = clamp01((k - i * cfg.bellStagger) / cfg.bellRingLife);
      if (p <= 0 || p >= 1) { r.g.visible = false; r.lineMat.opacity = 0; r.pointMat.opacity = 0; return; }
      const e = 1 - (1 - p) ** 2;
      r.g.visible = true;
      r.g.scale.setScalar(1 + (cfg.bellMaxScale - 1) * e);
      const op = 0.85 * (1 - p) ** 1.2 * smooth(0, 0.1, p);
      r.lineMat.opacity = op;
      r.pointMat.opacity = op * 0.6;
      tmp.copy(letter.cRose).lerp(letter.cAwake, i / Math.max(1, rings.length - 1));
      r.lineMat.color.copy(tmp);
      r.pointMat.color.copy(tmp);
    });
    updateFlies(k, sec);

    // Destello: uno por onda, pequeño; la letra misma pasa de rosa a dorado.
    const pulse = Math.max(0, Math.cos(((k / cfg.bellStagger) % 1) * Math.PI * 2) * 0.5 + 0.5);
    return {
      lineOp: smooth(0, 0.1, k),
      pointOp: 0.8 * smooth(0, 0.1, k),
      color: new THREE.Color().copy(letter.cRose).lerp(letter.cAwake, smooth(0.15, 0.7, k)),
      flashOp: 0.18 * pulse * (1 - smooth(0.6, 0.9, k)),
      flashScale: 0.6 + 0.3 * pulse,
    };
  }

  // Letra despierta: las ondas ya pasaron; las luciérnagas siguen revoloteando.
  function awake(ms) {
    hideRings();
    updateFlies(1, ms / 1000 + durSec);
  }

  return { conjured, awake, reset, anchor: { x: cx, y: cy } };
}
