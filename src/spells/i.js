// spells/i.js — Hechizo de la I: GRAVEDAD INVERTIDA (gesto: subir).
//
// Lo imposible tiene que leerse: primero la luz que se suelta de la letra CAE, como
// toda luz que conocemos; luego la gravedad se invierte y asciende. Mientras dura, el
// polvo de toda la pantalla sube con ella y la letra se estira como si no pesara.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.I):
//   las partículas se sueltan de abajo hacia arriba (riseSpread), caen un instante
//   (riseFallSpeed), se invierten en riseReverseMs y suben a riseSpeed hasta apagarse.
//   El cuerpo se estira a riseStretch entre k 0.15–0.5 y vuelve entre k 0.75–1.
// Determinista: velocidad, fase y retraso de cada partícula salen de su índice.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const GOLDEN = 0.61803398875; // secuencia de baja discrepancia: variación sin azar

export function createGravity(letter) {
  const cfg = CONFIG.spells;
  const { points, width: w, height: h } = letter.shape;
  const P = points.length * cfg.riseDustPerPoint;

  const baseX = new Float32Array(P), baseY = new Float32Array(P);
  const delay = new Float32Array(P);   // s: se sueltan de abajo hacia arriba
  const speedMul = new Float32Array(P);
  const phase = new Float32Array(P);
  const up = new Float32Array(P);      // px subidos (negativo = ha caído)
  const durSec = cfg.durationMs.I / 1000;

  for (let i = 0; i < P; i++) {
    const src = points[i % points.length];
    baseX[i] = src.x; baseY[i] = src.y;
    const fromBottom = h > 0 ? 1 - src.y / h : 0;                 // 0 = abajo, 1 = arriba
    delay[i] = (1 - fromBottom) * cfg.riseSpread * durSec;        // abajo suelta primero
    speedMul[i] = 0.7 + 0.6 * ((i * GOLDEN) % 1);
    phase[i] = ((i * 0.7548776662) % 1) * Math.PI * 2;
  }

  const positions = new Float32Array(P * 3);
  const colors = new Float32Array(P * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dust = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 7, sizeAttenuation: false,
    }),
  );
  dust.frustumCulled = false;
  letter.group.add(dust);

  let lastMs = 0;
  const tmp = new THREE.Color();

  function write(i, brightness, mix, gold) {
    // mix: 0 rosa -> 1 ámbar; gold: 0..1 hacia dorado (hilo de la letra despierta)
    tmp.copy(letter.cRose).lerp(letter.cAmber, mix).lerp(letter.cAwake, gold);
    colors[i * 3] = tmp.r * brightness;
    colors[i * 3 + 1] = tmp.g * brightness;
    colors[i * 3 + 2] = tmp.b * brightness;
  }

  function reset() {
    up.fill(0);
    colors.fill(0);
    lastMs = 0;
    geo.attributes.color.needsUpdate = true;
  }

  function conjured(k, ms) {
    const dt = ms >= lastMs ? (ms - lastMs) / 1000 : 0;
    lastMs = ms;
    const sec = ms / 1000;
    const T = cfg.riseReverseMs / 1000;
    const H = cfg.riseHeight;

    for (let i = 0; i < P; i++) {
      const tau = sec - delay[i];
      if (tau < 0) { write(i, 0, 0, 0); continue; }
      // Velocidad vertical (px/s, + = arriba): empieza cayendo y se invierte suavemente.
      const s = smooth(0, T, tau);
      const v = -cfg.riseFallSpeed + (cfg.riseFallSpeed + cfg.riseSpeed * speedMul[i]) * s;
      up[i] += v * dt;
      const x = baseX[i] + (Math.sin(sec * 1.3 + phase[i]) * 3 * smooth(0, 1, tau)) / letter.scale;
      positions[i * 3] = x;
      positions[i * 3 + 1] = baseY[i] - up[i] / letter.scale; // y local crece hacia abajo
      const fade = smooth(0, 0.15, tau) * (1 - smooth(0.6 * H, H, up[i]));
      write(i, 0.9 * fade, smooth(0, H, Math.max(0, up[i])), 0);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    // Estiramiento: sube con suavidad, se sostiene y vuelve a su tamaño.
    const grow = smooth(0.15, 0.5, k) * (1 - smooth(0.75, 1, k));
    const bump = Math.exp(-(((k - 0.4) / 0.12) ** 2));
    return {
      lineOp: smooth(0, 0.15, k),
      pointOp: 0.8 * smooth(0, 0.15, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.55, 1, k)),
      flashOp: 0.18 * bump,
      flashScale: 0.6 + 0.6 * bump,
      stretch: 1 + (cfg.riseStretch - 1) * grow,
      // El polvo ambiental de la pantalla sube mientras la gravedad está invertida.
      lift: smooth(0.1, 0.35, k) * (1 - smooth(0.7, 1, k)),
    };
  }

  // Letra despierta: un hilo fino de polvo dorado sigue subiendo despacio.
  function awake(ms) {
    const sec = ms / 1000 + durSec;
    const H = cfg.riseHeight * 0.6;
    for (let i = 0; i < P; i++) {
      if (i % 5 !== 0) { write(i, 0, 0, 0); continue; }
      const cycle = (sec * cfg.riseSpeed * 0.5 * speedMul[i] + i * 37) % H;
      positions[i * 3] = baseX[i];
      positions[i * 3 + 1] = baseY[i] - cycle / letter.scale;
      write(i, 0.55 * Math.sin(Math.PI * (cycle / H)), 0.5, 0.8);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return { conjured, awake, reset };
}
