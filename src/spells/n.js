// spells/n.js — Hechizo de la N: RELÁMPAGO (gesto: zigzag).
//
// Descargas quebradas saltan entre las dos astas de la N, iluminándolas como teclas; la
// última descarga sigue la propia diagonal, que se vuelve el relámpago. Al terminar, una
// chispa pasa el relevo a la SIGUIENTE letra de la palabra (N -> E) y la enciende un
// instante (contagio). Si ya está despierta, la hace saltar.
// Todo sale de la N: puntos de su trazo, agrupados por asta, y su diagonal con ruido.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.N):
//   descarga i en k = 0.10 + i * boltStagger, dura boltLife; la última es la diagonal.
//   Luego la chispa viaja a la letra siguiente (más lenta cuanto más lejos) y la N queda dorada.
// Determinista: alturas y quiebres salen de funciones fijas del índice (el "ruido" no
// decide qué pasa, solo decora; cambia cada ~35 ms para parpadear).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const frac = (v) => v - Math.floor(v);
const START = 0.1;
// Duración del vuelo de la chispa (fracción de la duración total): entre 0.12 y 0.30 según
// la distancia, para que un viaje largo no pase demasiado rápido.
const ECHOES = 6;

// "Ruido" determinista en [-1, 1] a partir de números (no es azar: misma entrada, misma salida).
const noise = (a, b, c) => frac(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) * 2 - 1;

export function createLightning(letter) {
  const cfg = CONFIG.spells;
  const { points, width: w, height: h } = letter.shape;
  const P = points.length;
  const B = cfg.boltCount;
  const S = cfg.boltSegments;

  // Asta izquierda, derecha o diagonal para cada punto del trazo.
  const side = new Uint8Array(P);
  points.forEach((p, j) => { side[j] = p.x < 0.3 * w ? 0 : p.x > 0.7 * w ? 1 : 2; });

  // Cada descarga: de un asta a otra, a alturas fijas; la última recorre la diagonal.
  const bolts = Array.from({ length: B }, (_, i) => {
    const last = i === B - 1;
    const ya = (0.2 + 0.6 * frac(i * 0.61803)) * h;
    const yb = (0.2 + 0.6 * frac(i * 0.61803 + 0.4)) * h;
    return {
      t: START + i * cfg.boltStagger,
      x0: 0.14 * w, y0: last ? 0.06 * h : ya,
      x1: 0.86 * w, y1: last ? 0.94 * h : yb,
      diag: last,
    };
  });

  const mk = (n, size, lines) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const obj = lines
      ? new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }))
      : new THREE.Points(geo, new THREE.PointsMaterial({
        map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, size, sizeAttenuation: false,
      }));
    obj.frustumCulled = false;
    letter.group.add(obj);
    return { pos, col, geo };
  };

  const keys = mk(P, 9, false);                 // las astas como teclas
  points.forEach((p, j) => { keys.pos[j * 3] = p.x; keys.pos[j * 3 + 1] = p.y; });
  keys.geo.attributes.position.needsUpdate = true;
  const boltLines = mk(B * S * 2, 0, true);     // tramos de las descargas
  const boltDots = mk(B * (S + 1), 15, false);  // brillo en cada quiebre
  const ball = mk(1 + ECHOES, 16, false);       // la chispa que viaja a la vecina

  // Al final la chispa pasa el relevo a la siguiente letra de la palabra (en el orden de
  // `font.word`, dando la vuelta): N -> E. Así cada contagio repite el orden de DISNEY.
  let target = null, pending = null, sent = false, send = 0.17;
  function nextPeer() {
    const peers = letter.peers;
    const i = peers.indexOf(letter);
    return peers[(i + 1) % peers.length];
  }
  function start() {
    target = nextPeer();
    pending = null; sent = false;
    // Más lejos, más lento: el vuelo no debe ser un parpadeo al cruzar la pantalla.
    const sc = letter.scale;
    const d = Math.hypot(
      target.pos.x + (target.shape.width * target.scale) / 2 - (letter.pos.x + (w * sc) / 2),
      target.pos.y + (target.shape.height * target.scale) / 2 - (letter.pos.y + (h * sc) / 2),
    );
    send = 0.12 + 0.18 * clamp01(d / (0.8 * window.innerWidth));
  }
  const takeArrival = () => { const t = pending; pending = null; return t; };

  const tmp = new THREE.Color();
  const white = new THREE.Color(1, 0.96, 0.82); // el núcleo de la descarga es casi blanco cálido
  const set = (arr, i, c, b) => { arr[i * 3] = c.r * b; arr[i * 3 + 1] = c.g * b; arr[i * 3 + 2] = c.b * b; };

  function reset() {
    pending = null; sent = false;
    [keys, boltLines, boltDots, ball].forEach((o) => { o.col.fill(0); o.geo.attributes.color.needsUpdate = true; });
  }

  function conjured(k, ms) {
    const flick = Math.floor(ms / 35);          // el relámpago parpadea: nuevo quiebre cada 35 ms
    const stemPulse = [0, 0];
    let diagGlow = 0;
    const endK = bolts[B - 1].t + cfg.boltLife;

    bolts.forEach((b, i) => {
      const u = (k - b.t) / cfg.boltLife;       // 0..1 durante la descarga
      const live = u >= 0 && u <= 1;
      if (k >= b.t) {
        const decay = Math.exp(-(k - b.t) / cfg.sparkPulse);
        if (b.diag) { diagGlow = Math.max(diagGlow, decay); stemPulse[0] = Math.max(stemPulse[0], decay * 0.6); stemPulse[1] = Math.max(stemPulse[1], decay * 0.6); }
        else { stemPulse[0] = Math.max(stemPulse[0], decay); stemPulse[1] = Math.max(stemPulse[1], decay); }
      }
      const dx = b.x1 - b.x0, dy = b.y1 - b.y0, len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;      // perpendicular
      const bright = live ? (1 - u * u) * (0.75 + 0.25 * noise(i, flick, 1)) : 0;
      for (let s = 0; s <= S; s++) {
        const t = s / S;
        // El quiebre es máximo a mitad del trazo y nulo en los extremos (nace y muere en el asta).
        const off = noise(s, i, flick) * cfg.boltJag * h * Math.sin(Math.PI * t) * (b.diag ? 1.2 : 1);
        const x = b.x0 + dx * t + nx * off, y = b.y0 + dy * t + ny * off;
        const di = i * (S + 1) + s;
        boltDots.pos[di * 3] = x; boltDots.pos[di * 3 + 1] = y;
        tmp.copy(white).lerp(letter.cAmber, 0.3);
        set(boltDots.col, di, tmp, bright * 1.0);
        if (s > 0) {
          const li = (i * S + (s - 1)) * 2;
          const px = boltDots.pos[(di - 1) * 3], py = boltDots.pos[(di - 1) * 3 + 1];
          boltLines.pos[li * 3] = px; boltLines.pos[li * 3 + 1] = py;
          boltLines.pos[li * 3 + 3] = x; boltLines.pos[li * 3 + 4] = y;
          tmp.copy(white).lerp(letter.cAwake, 0.25);
          set(boltLines.col, li, tmp, bright); set(boltLines.col, li + 1, tmp, bright);
        }
      }
    });

    // Teclas: las astas se encienden al recibir la descarga; la diagonal, en la última.
    const final = smooth(0.82, 1, k);
    for (let j = 0; j < P; j++) {
      const v = side[j] === 2 ? diagGlow : stemPulse[side[j]];
      tmp.copy(letter.cAmber).lerp(letter.cAwake, final);
      set(keys.col, j, tmp, Math.min(1, v + final * 0.6));
    }

    // Chispa que viaja a la letra vecina.
    const sendT0 = endK, sendT1 = endK + send;
    for (let e = 0; e <= ECHOES; e++) {
      const kk = k - e * 0.008;
      if (!target || kk < sendT0 || kk > sendT1) { set(ball.col, e, letter.cAwake, 0); continue; }
      const u = clamp01((kk - sendT0) / send);
      const sc = letter.scale;
      const tx = (target.pos.x + (target.shape.width * target.scale) / 2 - letter.pos.x) / sc;
      const ty = (target.pos.y + (target.shape.height * target.scale) / 2 - letter.pos.y) / sc;
      ball.pos[e * 3] = bolts[B - 1].x1 + (tx - bolts[B - 1].x1) * u;
      ball.pos[e * 3 + 1] = bolts[B - 1].y1 + (ty - bolts[B - 1].y1) * u - 0.3 * h * Math.sin(Math.PI * u);
      tmp.copy(e === 0 ? white : letter.cAmber).lerp(letter.cAwake, 0.4);
      set(ball.col, e, tmp, e === 0 ? 1 : 0.6 * (1 - e / (ECHOES + 1)) ** 2);
    }
    if (!sent && target && k >= sendT1) { sent = true; pending = target; }

    [keys, boltLines, boltDots, ball].forEach((o) => { o.geo.attributes.color.needsUpdate = true; });
    boltLines.geo.attributes.position.needsUpdate = true;
    boltDots.geo.attributes.position.needsUpdate = true;
    ball.geo.attributes.position.needsUpdate = true;

    const pulse = Math.max(stemPulse[0], stemPulse[1], diagGlow);
    return {
      lineOp: 0.35 + 0.65 * smooth(0, 0.4, k),
      pointOp: 0.5 * smooth(0, 0.4, k),
      color: tmp.clone().copy(letter.cRose).lerp(letter.cAwake, smooth(0.5, 1, k)),
      flashOp: 0.2 * pulse,
      flashScale: 0.8,
    };
  }

  function awake() { reset(); }

  return { start, conjured, awake, reset, takeArrival };
}
