// spells/i.js — Hechizo de la I: REBOTE LIGERO (gesto: subir).
//
// La I salta de contenta: se encoge un instante (toma impulso), se estira hacia arriba
// y rebota hasta asentarse (squash and stretch, un principio clásico de la animación).
// De su trazo suben globos de luz que se balancean y estallan en chispas.
// Todo sale de la I: su contorno estirado y puntos muestreados de su propio trazo.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.I):
//   0–0.12 impulso (se encoge) · 0.12–0.30 salto (se estira) · 0.30–1 rebote amortiguado.
//   Los globos se sueltan de abajo hacia arriba entre k=0.1 y 0.1+riseSpread.
// Determinista: retraso, velocidad, balanceo y fase salen del índice del globo.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const GOLDEN = 0.61803398875;
const frac = (v) => v - Math.floor(v);
const SPARKS = 6;       // chispas por globo al estallar
const SPARK_LIFE = 0.45; // s

export function createBounce(letter) {
  const cfg = CONFIG.spells;
  const { points, height: h } = letter.shape;
  const B = cfg.riseBalloons;
  const durSec = cfg.durationMs.I / 1000;

  // Cada globo nace de un punto del trazo de la letra.
  const baseX = new Float32Array(B), baseY = new Float32Array(B);
  const delay = new Float32Array(B), speed = new Float32Array(B);
  const sway = new Float32Array(B), swayHz = new Float32Array(B), phase = new Float32Array(B);
  const popH = new Float32Array(B), tone = new Float32Array(B);
  for (let i = 0; i < B; i++) {
    const src = points[Math.floor(frac(i * GOLDEN) * points.length)];
    baseX[i] = src.x; baseY[i] = src.y;
    // De abajo hacia arriba: los puntos bajos salen antes.
    const fromBottom = h > 0 ? 1 - src.y / h : 0;
    delay[i] = (0.1 + cfg.riseSpread * fromBottom) * durSec;
    speed[i] = cfg.riseSpeed * (0.75 + 0.5 * frac(i * 0.7548776662));
    sway[i] = cfg.riseSwayPx * (0.5 + 0.5 * frac(i * 0.5698402909));
    swayHz[i] = 0.8 + 0.8 * frac(i * 0.3247179572);
    phase[i] = frac(i * 0.4142135623) * Math.PI * 2;
    popH[i] = cfg.riseHeight * (0.8 + 0.4 * frac(i * 0.2360679775));
    tone[i] = i % 3; // 0 rosa, 1 ámbar, 2 dorado
  }

  const mkPoints = (n, size) => {
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
  const balloons = mkPoints(B, 15);
  const sparks = mkPoints(B * SPARKS, 6);

  const palette = [letter.cRose, letter.cAmber, letter.cAwake];
  const tmp = new THREE.Color();
  const setCol = (arr, i, c, b) => { arr[i * 3] = c.r * b; arr[i * 3 + 1] = c.g * b; arr[i * 3 + 2] = c.b * b; };

  function reset() {
    balloons.col.fill(0); sparks.col.fill(0);
    balloons.geo.attributes.color.needsUpdate = true;
    sparks.geo.attributes.color.needsUpdate = true;
  }

  function conjured(k, ms) {
    const sec = ms / 1000;
    const s = 1 / letter.scale; // px de pantalla -> unidades locales

    for (let i = 0; i < B; i++) {
      const tau = sec - delay[i];
      const popAt = popH[i] / speed[i];
      // Globo: sube recto con balanceo lateral hasta su altura de estallido.
      if (tau < 0 || tau > popAt) {
        setCol(balloons.col, i, palette[tone[i]], 0);
      } else {
        const up = speed[i] * tau;
        balloons.pos[i * 3] = baseX[i] + Math.sin(tau * swayHz[i] * Math.PI * 2 + phase[i]) * sway[i] * s * smooth(0, 0.6, tau);
        balloons.pos[i * 3 + 1] = baseY[i] - up * s;
        const fade = smooth(0, 0.2, tau) * (1 - smooth(popAt - 0.3, popAt, tau) * 0.4);
        setCol(balloons.col, i, palette[tone[i]], 0.95 * fade);
      }
      // Chispas: al estallar salen en abanico y se apagan.
      const t2 = tau - popAt;
      for (let j = 0; j < SPARKS; j++) {
        const idx = i * SPARKS + j;
        if (t2 < 0 || t2 > SPARK_LIFE) { setCol(sparks.col, idx, palette[tone[i]], 0); continue; }
        const a = (j / SPARKS) * Math.PI * 2 + phase[i];
        const r = 28 * (1 - (1 - t2 / SPARK_LIFE) ** 2) * s;
        const popX = baseX[i] + Math.sin(popAt * swayHz[i] * Math.PI * 2 + phase[i]) * sway[i] * s;
        const popY = baseY[i] - popH[i] * s;
        sparks.pos[idx * 3] = popX + Math.cos(a) * r;
        sparks.pos[idx * 3 + 1] = popY + Math.sin(a) * r;
        setCol(sparks.col, idx, palette[tone[i]], 0.9 * (1 - t2 / SPARK_LIFE));
      }
    }
    balloons.geo.attributes.position.needsUpdate = true;
    balloons.geo.attributes.color.needsUpdate = true;
    sparks.geo.attributes.position.needsUpdate = true;
    sparks.geo.attributes.color.needsUpdate = true;

    // Squash and stretch: impulso, salto y rebote amortiguado alrededor de 1.
    let stretch;
    if (k < 0.12) stretch = 1 - (1 - cfg.riseSquash) * smooth(0, 0.12, k);
    else if (k < 0.3) stretch = cfg.riseSquash + (cfg.riseStretch - cfg.riseSquash) * smooth(0.12, 0.3, k);
    else {
      const u = (k - 0.3) / 0.7;
      stretch = 1 + (cfg.riseStretch - 1) * Math.exp(-4 * u) * Math.cos(2 * Math.PI * 1.5 * u);
    }
    const bump = Math.exp(-(((k - 0.22) / 0.07) ** 2));
    return {
      lineOp: smooth(0, 0.1, k),
      pointOp: 0.8 * smooth(0, 0.1, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.2, 0.8, k)),
      flashOp: 0.22 * bump,
      flashScale: 0.6 + 0.6 * bump,
      stretch,
      lift: smooth(0.15, 0.35, k) * (1 - smooth(0.7, 1, k)),
    };
  }

  // Letra despierta: unas pocas luces siguen subiendo despacio, en ciclo.
  function awake(ms) {
    const sec = ms / 1000 + durSec;
    const s = 1 / letter.scale;
    const H = cfg.riseHeight * 0.6;
    for (let i = 0; i < B; i++) {
      if (i % 5 !== 0) { setCol(balloons.col, i, palette[0], 0); continue; }
      const cyc = (sec * cfg.riseSpeed * 0.35 + i * 41) % H;
      balloons.pos[i * 3] = baseX[i] + Math.sin(sec * swayHz[i] + phase[i]) * sway[i] * 0.5 * s;
      balloons.pos[i * 3 + 1] = baseY[i] - cyc * s;
      setCol(balloons.col, i, palette[2], 0.6 * Math.sin(Math.PI * (cyc / H)));
    }
    sparks.col.fill(0);
    balloons.geo.attributes.position.needsUpdate = true;
    balloons.geo.attributes.color.needsUpdate = true;
    sparks.geo.attributes.color.needsUpdate = true;
  }

  return { conjured, awake, reset };
}
