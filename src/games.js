// games.js — los seis minijuegos. El gesto de cada letra abre su minijuego; al completarlo se
// dispara el hechizo. Reglas comunes: sin fallo ni números (el progreso se ve en la luz), todo
// determinista (el "azar" decorativo sale de funciones fijas) y siempre se puede abandonar.
//
// Cada juego es createXGame(letter) -> { start(), update(dtMs, t, input, ease), stop() }.
// `ease` (0..1) es la ayuda: si la persona se atasca, el reto se vuelve más permisivo; nunca se
// completa solo: quien juega es la persona.
// update devuelve { progress 0..1, line, point, fill, flash, done, info? } y la letra aplica
// eso a su contorno, puntos y relleno. Todo se dibuja en coordenadas locales de la letra.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haloTexture } from './render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const frac = (v) => v - Math.floor(v);
const hash = (a, b = 0) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);
const TAU = Math.PI * 2;

// Capa de puntos de luz (halos) dentro de la letra.
function pointsLayer(letter, n, size) {
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
  return {
    n,
    set(i, x, y, c, b) {
      pos[i * 3] = x; pos[i * 3 + 1] = y;
      col[i * 3] = c.r * b; col[i * 3 + 1] = c.g * b; col[i * 3 + 2] = c.b * b;
    },
    off(i) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; },
    flush() { geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; },
    clear() { col.fill(0); geo.attributes.color.needsUpdate = true; },
  };
}

// ---------------------------------------------------------------- D: hazla sonar
export function createBellGame(letter) {
  const G = CONFIG.games.bell;
  const { width: w, height: h } = letter.shape;
  const ring = pointsLayer(letter, 28, 8);
  let energy = 0, lastPhi = null, lastSign = 0, pulse = 0;

  return {
    start() { energy = Math.max(energy, 0.1); lastPhi = null; },
    update(dtMs, t, input, ease = 0) {
      const dt = dtMs / 1000;
      const sc = letter.scale;
      const cx = letter.pos.x + (w * sc) / 2, cy = letter.pos.y + (h * sc) / 2;
      if (input && input.active) {
        const dx = input.x - cx, dy = input.y - cy;
        const dist = Math.hypot(dx, dy), phi = Math.atan2(dy, dx);
        const reach = Math.max(w, h) * sc * 1.7 + 140;
        if (lastPhi !== null && dist > 24 && dist < reach) {
          let d = phi - lastPhi;
          if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
          energy += Math.abs(d) * G.gain * (1 + 2 * ease); // girar alrededor de la campana la empuja
        }
        lastPhi = phi;
      } else lastPhi = null;
      energy = clamp01(energy - G.decay * (1 - 0.6 * ease) * dt);

      // La campana cuelga del centro de arriba y se balancea más cuanto más energía.
      const amp = G.maxSwing * energy ** 0.8;
      const s = Math.sin(t * G.swingHz * TAU);
      letter.sway = amp * s;
      const sign = Math.sign(s);
      if (sign !== lastSign && amp > 0.06) pulse = 1; // pasa por el centro: suena
      lastSign = sign;
      pulse *= Math.exp(-dt * 3.2);

      // Onda de sonido: un anillo de puntos que se expande desde la boca de la campana.
      const r = (1 - pulse) * 0.9 * Math.max(w, h);
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * TAU;
        ring.set(i, 0.5 * w + Math.cos(a) * r, 0.55 * h + Math.sin(a) * r * 0.8, letter.cAmber, pulse * 0.9);
      }
      ring.flush();
      return {
        progress: energy, line: 0.3 + 0.55 * energy, point: 0.2 + 0.45 * energy,
        fill: 0.9 * energy, flash: pulse * 0.45 * energy, done: energy >= 0.97,
      };
    },
    stop() { letter.sway = 0; ring.clear(); energy = 0; pulse = 0; },
  };
}

// ---------------------------------------------------------------- I: enciende la vela
export function createCandleGame(letter) {
  const G = CONFIG.games.candle;
  const { width: w, height: h } = letter.shape;
  const N = G.fireflies;
  const flies = pointsLayer(letter, N + 6, 15);
  const flame = pointsLayer(letter, 3, 22);
  const fl = [];
  let lit = 0, spawned = 0, timer = 0, flash = 0;

  return {
    start() { timer = 0; },
    update(dtMs, t, input, ease = 0) {
      const dt = dtMs / 1000, sc = letter.scale;
      timer -= dtMs;
      const alive = fl.filter((f) => f.alive).length;
      if (timer <= 0 && alive < 3 && lit + alive < N) {
        // Nacen abajo, alrededor de la base de la vela (posiciones fijas por índice).
        fl.push({
          alive: true, ph: hash(spawned, 3) * TAU,
          x: (0.5 + (hash(spawned) - 0.5) * 3.4) * w,
          y: h * (1.5 + hash(spawned, 1) * 0.8),
        });
        spawned++; timer = G.spawnMs * (1 - 0.4 * ease);
      }
      const wx = 0.5 * w, wy = -0.06 * h;     // la mecha
      const [cxL, cyL] = input && input.active ? letter.toLocal(input.x, input.y) : [null, null];
      fl.forEach((f) => {
        if (!f.alive) return;
        const toCur = cxL !== null ? Math.hypot(cxL - f.x, cyL - f.y) * sc : Infinity;
        if (toCur < G.pullPx * (1 + ease)) { // te sigue si la acercas con tu luz
          const k = Math.min(1, (G.pullSpeed * dt) / Math.max(1, toCur));
          f.x += (cxL - f.x) * k; f.y += (cyL - f.y) * k;
        } else {                              // si no, divaga
          f.x += (Math.sin(t * 0.9 + f.ph) * 22 * dt) / sc;
          f.y += (Math.cos(t * 0.7 + f.ph) * 16 * dt) / sc;
        }
        f.y = Math.min(f.y, h * 2.6);
        if (Math.hypot(f.x - wx, f.y - wy) * sc < G.lightPx * (1 + 0.6 * ease) * h * sc) { f.alive = false; lit++; flash = 1; }
      });
      flash *= Math.exp(-dt * 4);

      const p = lit / N;
      let i = 0;
      fl.forEach((f) => {
        if (!f.alive || i >= flies.n) return;
        flies.set(i++, f.x, f.y, letter.cAwake, 0.7 + 0.3 * Math.sin(t * 6 + f.ph));
      });
      while (i < flies.n) flies.off(i++);
      flies.flush();
      // Llama: una brasa tenue que crece con cada luciérnaga hasta una llama plena.
      const size = 0.12 + 0.9 * p;
      flame.set(0, wx, wy - 0.05 * h, letter.cRose, 0.35 + 0.4 * p);
      flame.set(1, wx, wy - 0.16 * h * size, letter.cAmber, 0.6 * p);
      flame.set(2, wx, wy - 0.26 * h * size, letter.cAwake, 0.8 * p);
      flame.flush();
      return {
        progress: p, line: 0.3 + 0.5 * p, point: 0.2 + 0.4 * p, fill: 0.9 * p,
        flash: flash * 0.5, done: lit >= N,
      };
    },
    stop() { flies.clear(); flame.clear(); fl.length = 0; lit = 0; spawned = 0; flash = 0; },
  };
}

// ---------------------------------------------------------------- S: sigue la luz
export function createRibbonGame(letter) {
  const G = CONFIG.games.ribbon;
  const path = pointsLayer(letter, 64, 6);
  const guide = pointsLayer(letter, 14, 22);
  let progress = 0;
  const hist = [];
  let lastLeader = null; // posición en pantalla del guía (la usa el mini-tutorial para jugar solo)

  // Ida y vuelta en una onda a lo ancho de la pantalla útil (coordenadas de pantalla).
  const leader = (s, yc, Hu, W) => {
    const tri = 1 - Math.abs(((s % 1) + 1) % 1 * 2 - 1);
    return [0.12 * W + 0.76 * W * tri, yc + 0.1 * Hu * Math.sin(TAU * 1.25 * tri)];
  };

  return {
    start() { progress = Math.max(progress, 0.05); hist.length = 0; },
    update(dtMs, t, input, ease = 0) {
      const dt = dtMs / 1000;
      const W = window.innerWidth;
      const Hu = window.innerHeight * (1 - (CONFIG.guide.enabled ? CONFIG.guide.reserve : 0));
      const cyS = letter.pos.y + (letter.shape.height * letter.scale) / 2;
      const yc = Math.min(0.58 * Hu, Math.max(0.18 * Hu, cyS));
      const [lx, ly] = leader(t * G.speed, yc, Hu, W);
      lastLeader = [lx, ly];
      const following = input && input.active && Math.hypot(input.x - lx, input.y - ly) < G.tolerance * (1 + 0.8 * ease);
      progress = clamp01(progress + (following ? G.rate * (1 + ease) : -G.decay * (1 - 0.7 * ease)) * dt);

      // El camino (tenue, se enciende con el progreso) y el guía con su estela.
      for (let i = 0; i < path.n; i++) {
        const s = i / (path.n - 1);
        const [px, py] = leader(s * 0.5, yc, Hu, W);
        const [x, y] = letter.toLocal(px, py);
        path.set(i, x, y, letter.cAmber, 0.12 + 0.5 * progress * (0.5 + 0.5 * Math.sin(s * 9 - t * 3)));
      }
      path.flush();
      hist.unshift([lx, ly]); if (hist.length > guide.n) hist.pop();
      for (let i = 0; i < guide.n; i++) {
        if (!hist[i]) { guide.off(i); continue; }
        const [x, y] = letter.toLocal(hist[i][0], hist[i][1]);
        guide.set(i, x, y, i === 0 ? letter.cAwake : letter.cRose, (1 - i / guide.n) * (following ? 1 : 0.7));
      }
      guide.flush();
      return {
        progress, line: 0.3 + 0.5 * progress, point: 0.2 + 0.4 * progress, fill: 0.9 * progress,
        flash: following ? 0.15 * progress : 0, done: progress >= 1,
      };
    },
    stop() { path.clear(); guide.clear(); progress = 0; hist.length = 0; lastLeader = null; },
  };
}

// ---------------------------------------------------------------- N: agita el cielo
export function createStarGame(letter) {
  const G = CONFIG.games.star;
  const { width: w, height: h } = letter.shape;
  const centre = pointsLayer(letter, 3, 30);
  const sparks = pointsLayer(letter, 40, 9);
  const S = [];
  let energy = 0, count = 0, flash = 0, ampNow = G.amplitude;
  const ax = { x: { ext: null, dir: 0 }, y: { ext: null, dir: 0 } };

  // Cuenta un sacudido cada vez que el cursor invierte su sentido tras recorrer `amplitude`.
  function reversal(axis, v) {
    const a = ax[axis], amp = ampNow;
    if (a.ext === null) { a.ext = v; return false; }
    if (a.dir === 0) {
      if (Math.abs(v - a.ext) >= amp) { a.dir = Math.sign(v - a.ext); a.ext = v; }
      return false;
    }
    if (a.dir > 0) {
      if (v > a.ext) a.ext = v;
      else if (a.ext - v >= amp) { a.dir = -1; a.ext = v; return true; }
    } else {
      if (v < a.ext) a.ext = v;
      else if (v - a.ext >= amp) { a.dir = 1; a.ext = v; return true; }
    }
    return false;
  }

  return {
    start() { ax.x.ext = ax.y.ext = null; },
    update(dtMs, t, input, ease = 0) {
      const dt = dtMs / 1000;
      ampNow = G.amplitude / (1 + 0.6 * ease);
      if (input && input.active) {
        const rx = reversal('x', input.x), ry = reversal('y', input.y);
        if (rx || ry) {
          energy = clamp01(energy + G.gain * (1 + ease));
          flash = 1;
          const [lx, ly] = letter.toLocal(input.x, input.y);
          for (let k = 0; k < 5; k++) {          // chispas que salen del cursor
            const a = hash(count, k) * TAU, sp = 40 + hash(count, k + 9) * 90;
            S.push({ x: lx, y: ly, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
          }
          count++;
        }
      }
      energy = clamp01(energy - G.decay * (1 - 0.6 * ease) * dt);
      flash *= Math.exp(-dt * 5);
      for (let i = S.length - 1; i >= 0; i--) {
        const s = S[i];
        s.x += (s.vx * dt) / letter.scale; s.y += (s.vy * dt) / letter.scale;
        s.vx *= 0.96; s.vy *= 0.96; s.life -= dt * 1.4;
        if (s.life <= 0) S.splice(i, 1);
      }
      while (S.length > sparks.n) S.shift();
      for (let i = 0; i < sparks.n; i++) {
        const s = S[i];
        if (s) sparks.set(i, s.x, s.y, i % 2 ? letter.cAwake : letter.cAmber, s.life); else sparks.off(i);
      }
      sparks.flush();
      // La estrella del centro: su brillo es la energía.
      centre.set(0, 0.5 * w, 0.5 * h, letter.cAmber, 0.1 + 0.7 * energy);
      centre.set(1, 0.5 * w, 0.5 * h, letter.cAwake, 0.8 * energy ** 1.3 + flash * 0.4);
      centre.off(2);
      centre.flush();
      return {
        progress: energy, line: 0.3 + 0.55 * energy, point: 0.2 + 0.4 * energy, fill: 0.9 * energy,
        flash: flash * 0.3 + 0.2 * energy, done: energy >= 0.97, // margen: el decaimiento resta justo después del tope
      };
    },
    stop() { sparks.clear(); centre.clear(); S.length = 0; energy = 0; count = 0; },
  };
}

// ---------------------------------------------------------------- E: calma las cuerdas
export function createHarpGame(letter) {
  const G = CONFIG.games.harp;
  const { width: w, height: h } = letter.shape;
  const strings = pointsLayer(letter, 3 * 12, 10);
  const notes = pointsLayer(letter, 10, 14);
  let calm = 0;

  return {
    start() { calm = Math.max(calm, 0.05); },
    update(dtMs, t, input, ease = 0) {
      const dt = dtMs / 1000;
      const speed = input && input.active ? Math.hypot(input.vx || 0, input.vy || 0) : 1e9;
      calm = clamp01(calm + (speed < G.speedPx * (1 + 1.5 * ease) ? G.rate * (1 + ease) : -G.loss * (1 - 0.6 * ease)) * dt);

      // Tres cuerdas (los brazos de la E): se encienden de a una al ir creciendo la calma.
      const ys = [0.1, 0.5, 0.9];
      for (let s = 0; s < 3; s++) {
        const on = clamp01(calm * 3 - s);
        for (let i = 0; i < 12; i++) {
          const f = i / 11;
          const wob = Math.sin(t * 7 + f * 6 + s) * 0.02 * h * on;
          strings.set(s * 12 + i, (0.12 + 0.85 * f) * w, ys[s] * h + wob, s === 1 ? letter.cAwake : letter.cAmber, 0.1 + 0.9 * on);
        }
      }
      strings.flush();
      // Notas que se acercan a ti en calma y se alejan si te mueves.
      const [cx, cy] = input && input.active ? letter.toLocal(input.x, input.y) : [0.5 * w, 0.5 * h];
      const show = Math.floor(calm * notes.n);
      for (let i = 0; i < notes.n; i++) {
        if (i >= show) { notes.off(i); continue; }
        const a = t * (0.6 + 0.05 * i) + i * 1.1, r = (28 + 8 * (i % 3)) / letter.scale;
        notes.set(i, cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 2 ? letter.cAwake : letter.cRose, 0.9);
      }
      notes.flush();
      return {
        progress: calm, line: 0.3 + 0.5 * calm, point: 0.2 + 0.4 * calm, fill: 0.9 * calm,
        flash: 0.15 * calm, done: calm >= 1,
      };
    },
    stop() { strings.clear(); notes.clear(); calm = 0; },
  };
}

// ---------------------------------------------------------------- Y: riega la semilla
export function createFlowerGame(letter) {
  const G = CONFIG.games.flower;
  const { width: w, height: h } = letter.shape;
  const seed = pointsLayer(letter, 1, 24);
  const stem = pointsLayer(letter, 24, 9);
  const drops = pointsLayer(letter, 6, 10);
  let growth = 0, was = false;

  return {
    start() { growth = 0; was = false; },
    update(dtMs, t, input, ease = 0) {
      const dt = dtMs / 1000;
      const holding = !!(input && input.active && input.grab);
      let done = false, info;
      if (holding) {
        growth = clamp01(growth + G.rate * (1 + ease) * dt);
        was = true;
      } else {
        if (was && growth >= G.minGrowth * (1 - 0.4 * ease)) { // soltó a tiempo: florece
          done = true;
          info = { heldMs: growth * CONFIG.spells.chargeMs };
        } else if (was) growth = clamp01(growth - G.wilt * dt * 2); // soltó muy pronto: se marchita
        else growth = clamp01(growth - G.wilt * dt * 0.3);
        if (growth <= 0) was = false;
      }
      // Semilla en la bifurcación y tallo que sube mientras riegas.
      const fx = 0.5 * w, fy = 0.5 * h;
      seed.set(0, fx, fy, letter.cAwake, 0.5 + 0.4 * growth + 0.1 * Math.sin(t * 5));
      seed.flush();
      for (let i = 0; i < stem.n; i++) {
        const f = i / (stem.n - 1);
        if (f > growth) { stem.off(i); continue; }
        stem.set(i, fx + Math.sin(f * 5 + t) * 0.03 * w, fy - f * 0.9 * h, f > 0.85 ? letter.cRose : letter.cAmber, 0.9);
      }
      stem.flush();
      // Gotas de agua: caen del cursor hacia la semilla mientras mantienes.
      const [cx, cy] = input && input.active ? letter.toLocal(input.x, input.y) : [fx, fy];
      for (let i = 0; i < drops.n; i++) {
        if (!holding) { drops.off(i); continue; }
        const k = frac(t * 1.6 + i / drops.n);
        drops.set(i, cx + (fx - cx) * k, cy + (fy - cy) * k * k, letter.cRose, 1 - k);
      }
      drops.flush();
      return {
        progress: growth, line: 0.3 + 0.5 * growth, point: 0.2 + 0.4 * growth, fill: 0.9 * growth,
        flash: 0.1 * growth, done, info,
      };
    },
    stop() { seed.clear(); stem.clear(); drops.clear(); growth = 0; was = false; },
  };
}

export const GAMES = {
  D: createBellGame, I: createCandleGame, S: createRibbonGame,
  N: createStarGame, E: createHarpGame, Y: createFlowerGame,
};
