// dust.js — polvo ambiental: partículas casi invisibles que derivan despacio y se
// avivan al paso del punto de atención. Es decoración: el azar solo decide dónde
// nace cada partícula (con semilla fija), nunca qué pasa en el juego.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haloTexture, rgb } from './render.js';

// PRNG determinista (mulberry32): misma semilla, mismo polvo.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDust() {
  const n = CONFIG.visual.dustCount;
  const rand = rng(CONFIG.visual.dustSeed);
  const base = rgb(CONFIG.visual.colors.amber);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const vel = new Float32Array(n * 2); // deriva propia de cada partícula
  const phase = new Float32Array(n);
  let w = window.innerWidth, h = window.innerHeight;

  // Posiciones normalizadas 0..1: al cambiar el tamaño de pantalla el polvo se reparte igual.
  const nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    nx[i] = rand(); ny[i] = rand();
    const a = rand() * Math.PI * 2;
    const s = 0.4 + rand() * 0.6;
    vel[i * 2] = Math.cos(a) * s;
    vel[i * 2 + 1] = Math.sin(a) * s;
    phase[i] = rand() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size: CONFIG.visual.dustSize, sizeAttenuation: false,
    }),
  );

  // Empuje hacia arriba (0..1) que un hechizo da a todo el polvo (gravedad invertida).
  let lift = 0;
  const setLift = (v) => { lift = v; };
  // Calidez (0..1): el polvo se vuelve dorado y más brillante (hechizo E).
  let warmth = 0;
  const setWarmth = (v) => { warmth = v; };
  const gold = rgb(CONFIG.visual.colors.awake);
  const tint = new THREE.Color();

  function resize(width, height) { w = width; h = height; }

  function update(dt, time, input) {
    const { dustDrift, dustOpacity, dustReactRadius, dustReactGain } = CONFIG.visual;
    const r2 = dustReactRadius * dustReactRadius;
    for (let i = 0; i < n; i++) {
      // Deriva y envoltura en los bordes (en coordenadas normalizadas).
      nx[i] = (nx[i] + (vel[i * 2] * dustDrift * dt) / w + 1) % 1;
      ny[i] = (ny[i] + (vel[i * 2 + 1] * dustDrift * dt) / h - (lift * CONFIG.spells.riseGlobalLift * dt) / h + 1) % 1;
      const x = nx[i] * w, y = ny[i] * h;
      pos[i * 3] = x; pos[i * 3 + 1] = y;

      // Parpadeo lento y suave; más brillo cerca del punto de atención.
      let b = dustOpacity * (0.6 + 0.4 * Math.sin(time * 0.8 + phase[i]));
      if (input.active) {
        const dx = x - input.x, dy = y - input.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) b += dustReactGain * (1 - Math.sqrt(d2) / dustReactRadius) ** 2;
      }
      tint.copy(base).lerp(gold, warmth);
      b *= 1 + warmth * 2;
      col[i * 3] = tint.r * b; col[i * 3 + 1] = tint.g * b; col[i * 3 + 2] = tint.b * b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  return { object: points, update, resize, setLift, setWarmth };
}
