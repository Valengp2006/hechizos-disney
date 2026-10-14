// spells/n.js — Hechizo de la N: CASCADA DE CHISPAS (gesto: zigzag).
//
// Una chispa nace en la base de la N y rebota de asta a asta, como una pelota feliz,
// subiendo por la letra. Cada rebote ilumina el asta donde cae (como una tecla) y suelta
// unas estrellitas. La diagonal se enciende mientras la chispa la cruza en el aire.
// Todo sale de la N: los puntos de su propio trazo, agrupados por asta.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.N):
//   salta a partir de k=0.08; cada salto dura sparkFlight; al final todo queda dorado.
// Determinista: las alturas de los rebotes y las estrellitas salen de su índice.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const START = 0.08;
const ECHOES = 6;

export function createSparks(letter) {
  const cfg = CONFIG.spells;
  const { points, width: w, height: h } = letter.shape;
  const P = points.length;

  // Cada punto del trazo pertenece al asta izquierda, a la derecha o a la diagonal.
  const side = new Uint8Array(P);
  points.forEach((p, j) => { side[j] = p.x < 0.3 * w ? 0 : p.x > 0.7 * w ? 1 : 2; });

  // Waypoints: alternan izquierda/derecha y suben por la letra (y local, crece hacia abajo).
  const M = cfg.sparkBounces + 1;
  const wp = Array.from({ length: M }, (_, m) => ({
    x: (m % 2 === 0 ? 0.14 : 0.86) * w,
    y: (0.9 - (0.8 * m) / Math.max(1, M - 1)) * h,
    side: m % 2 === 0 ? 0 : 1,
    t: START + m * cfg.sparkFlight, // instante (k) en que llega
  }));

  const mk = (n, size) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const obj = new THREE.Points(geo, new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size, sizeAttenuation: false,
    }));
    obj.frustumCulled = false;
    letter.group.add(obj);
    return { pos, col, geo };
  };

  // Capa de luz sobre los puntos del trazo (las "teclas").
  const keys = mk(P, 9);
  points.forEach((p, j) => { keys.pos[j * 3] = p.x; keys.pos[j * 3 + 1] = p.y; });
  keys.geo.attributes.position.needsUpdate = true;
  const ball = mk(1 + ECHOES, 16);
  const S = cfg.sparkStars;
  const stars = mk(cfg.sparkBounces * S, 8);

  const tmp = new THREE.Color();
  const set = (arr, i, c, b) => { arr[i * 3] = c.r * b; arr[i * 3 + 1] = c.g * b; arr[i * 3 + 2] = c.b * b; };

  // Posición local de la chispa en el instante k (null si no está en el aire/asta).
  function ballAt(k) {
    if (k < wp[0].t) return null;
    if (k >= wp[M - 1].t) return { x: wp[M - 1].x, y: wp[M - 1].y, u: 1, flying: false };
    const i = Math.min(M - 2, Math.floor((k - START) / cfg.sparkFlight));
    const u = clamp01((k - wp[i].t) / cfg.sparkFlight);
    return {
      x: wp[i].x + (wp[i + 1].x - wp[i].x) * u,
      y: wp[i].y + (wp[i + 1].y - wp[i].y) * u - cfg.sparkArc * h * Math.sin(Math.PI * u),
      u, flying: true,
    };
  }

  function reset() {
    keys.col.fill(0); ball.col.fill(0); stars.col.fill(0);
    [keys, ball, stars].forEach((o) => { o.geo.attributes.color.needsUpdate = true; });
  }

  function conjured(k) {
    // Teclas: cada rebote ilumina su asta y se apaga; la diagonal brilla en el aire.
    const b0 = ballAt(k);
    const diag = b0 && b0.flying ? 0.7 * Math.sin(Math.PI * b0.u) : 0;
    const final = smooth(0.82, 1, k);
    const stemPulse = [0, 0];
    wp.forEach((m) => {
      if (k >= m.t) stemPulse[m.side] = Math.max(stemPulse[m.side], Math.exp(-(k - m.t) / cfg.sparkPulse));
    });
    for (let j = 0; j < P; j++) {
      const v = side[j] === 2 ? diag : stemPulse[side[j]];
      tmp.copy(letter.cAmber).lerp(letter.cAwake, final);
      set(keys.col, j, tmp, Math.min(1, v + final * 0.6));
    }

    // Chispa y su estela (ecos en el tiempo).
    for (let e = 0; e <= ECHOES; e++) {
      const b = ballAt(k - e * 0.008);
      const alive = b && k < wp[M - 1].t + 0.1;
      if (!alive) { set(ball.col, e, letter.cAwake, 0); continue; }
      ball.pos[e * 3] = b.x; ball.pos[e * 3 + 1] = b.y;
      tmp.copy(e === 0 ? letter.cRose : letter.cAmber).lerp(letter.cAwake, 0.4);
      set(ball.col, e, tmp, e === 0 ? 1 : 0.6 * (1 - e / (ECHOES + 1)) ** 2);
    }

    // Estrellitas: en cada rebote salen en abanico y se apagan.
    for (let m = 1; m < M; m++) {
      for (let s = 0; s < S; s++) {
        const idx = (m - 1) * S + s;
        const t = (k - wp[m].t) / 0.1; // 0..1
        if (t < 0 || t > 1) { set(stars.col, idx, letter.cAwake, 0); continue; }
        const a = -Math.PI / 2 + ((s + 0.5) / S - 0.5) * Math.PI * 1.6 + (wp[m].side ? 0.4 : -0.4);
        const r = 0.12 * h * (1 - (1 - t) ** 2);
        stars.pos[idx * 3] = wp[m].x + Math.cos(a) * r;
        stars.pos[idx * 3 + 1] = wp[m].y + Math.sin(a) * r;
        tmp.copy(letter.cAmber).lerp(letter.cAwake, s / S);
        set(stars.col, idx, tmp, 0.95 * (1 - t));
      }
    }
    keys.geo.attributes.color.needsUpdate = true;
    ball.geo.attributes.position.needsUpdate = true;
    ball.geo.attributes.color.needsUpdate = true;
    stars.geo.attributes.position.needsUpdate = true;
    stars.geo.attributes.color.needsUpdate = true;

    const pulse = Math.max(stemPulse[0], stemPulse[1]);
    return {
      lineOp: 0.35 + 0.65 * smooth(0, 0.4, k),
      pointOp: 0.5 * smooth(0, 0.4, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.5, 1, k)),
      flashOp: 0.14 * pulse,
      flashScale: 0.7,
    };
  }

  function awake() { reset(); }

  return { conjured, awake, reset };
}
