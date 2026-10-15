// finale.js — el cierre: convergencia, silencio, castillo y reposo.
//
//   play      se juega; cuando las seis están despiertas pasa a...
//   converge  las letras vuelan a su lugar en la palabra DISNEY
//   silence   un respiro sin música: la palabra se lee entera
//   reveal    las astas crecen en torres, aparecen muros, ventanas y una puerta
//   rest      todo respira; tras `idleResetMs` sin interacción pasa a...
//   closing   el castillo se apaga y todo vuelve a la oscuridad para el siguiente visitante
//
// El castillo es genérico: una torre por letra (alturas y anchos distintos, asimétrico),
// con almenas o con mástil y banderín; sin torre central simétrica, sin techos cónicos y
// sin arco de polvo. Todo se dibuja con líneas finas y puntos de luz, como el resto.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haloTexture, rgb } from './render.js';
import { idleResetEnabled } from './mode.js';
import { silence, unsilence } from './audio.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const smooth = (a, b, v) => ease((v - a) / (b - a));
const REF = 200; // em de referencia de las letras (ver letter.js)

export function createFinale({ scene, letters }) {
  const F = CONFIG.finale;
  const group = new THREE.Group();
  scene.add(group);

  let phase = 'play';
  let t0 = 0;                    // instante en que empezó la fase actual (ms)
  let lastActivity = 0;
  let lastX = 0, lastY = 0;
  let moves = null;              // [{l, from, to}] de la convergencia
  let castle = null;             // {segs, pts, ...} se construye al terminar de converger

  const gold = rgb(CONFIG.visual.colors.awake);
  const amber = rgb(CONFIG.visual.colors.amber);
  const tmp = new THREE.Color();

  // ---------- Convergencia: dónde queda cada letra en la palabra ----------
  function wordLayout(W, H) {
    const n = letters.letters.length;
    const widthSum = letters.letters.reduce((s, l) => s + l.shape.width / REF, 0);
    let S = (F.wordWidthRatio * W) / (widthSum + (n - 1) * F.wordGap);
    S = Math.min(S, 0.34 * Math.min(H, W * 0.75));
    // Que la torre más alta (con su mástil) quepa arriba, también en pantallas muy anchas.
    const maxLetterH = Math.max(...letters.letters.map((l) => l.shape.height)) / REF;
    const maxTower = Math.max(...Object.values(F.towerHeights));
    const room = F.wordBaseline * H - 0.04 * H;
    S = Math.min(S, room / (maxLetterH * (1 + maxTower + 0.75)));
    const total = widthSum * S + (n - 1) * F.wordGap * S;
    let x = (W - total) / 2;
    // El castillo (letras + torres) se centra en vertical; wordBaseline es el tope por abajo.
    // Así en pantallas verticales no queda pegado al fondo con todo el cielo vacío.
    const blockH = maxLetterH * S * (1 + maxTower + 0.75);
    const base = Math.min(F.wordBaseline * H, 0.52 * H + blockH / 2);
    return letters.letters.map((l) => {
      const w = (l.shape.width / REF) * S, h = (l.shape.height / REF) * S;
      const to = { cx: x + w / 2, cy: base - h / 2, size: S };
      x += w + F.wordGap * S;
      return to;
    });
  }

  function startConverge(now) {
    const W = window.innerWidth, H = window.innerHeight;
    const targets = wordLayout(W, H);
    moves = letters.letters.map((l, i) => ({
      l,
      from: {
        cx: l.pos.x + (l.shape.width * l.scale) / 2,
        cy: l.pos.y + (l.shape.height * l.scale) / 2,
        size: l.scale * REF,
      },
      to: targets[i],
    }));
    phase = 'converge'; t0 = now;
  }

  function stepConverge(now) {
    const p = ease((now - t0) / F.convergeMs);
    for (const m of moves) {
      m.l.place(
        m.from.cx + (m.to.cx - m.from.cx) * p,
        m.from.cy + (m.to.cy - m.from.cy) * p,
        m.from.size + (m.to.size - m.from.size) * p,
      );
    }
    if (now - t0 >= F.convergeMs) {
      buildCastle();
      silence();                 // música fuera: el silencio antes de la revelación
      phase = 'silence'; t0 = now;
    }
  }

  // ---------- Castillo ----------
  function buildCastle() {
    const segs = [];  // {x0,y0,x1,y1, ta, tb, kind}
    const dots = [];  // {x,y, ta, kind}
    const boxes = letters.letters.map((l) => ({
      char: l.char,
      x: l.pos.x, y: l.pos.y,
      w: l.shape.width * l.scale, h: l.shape.height * l.scale,
    }));
    const seg = (x0, y0, x1, y1, ta, tb, kind = 'wall') => segs.push({ x0, y0, x1, y1, ta, tb, kind });

    boxes.forEach((b, i) => {
      const cx = b.x + b.w / 2;
      const tw = b.w * F.towerWidths[b.char];
      const xl = cx - tw / 2, xr = cx + tw / 2;
      const ext = b.h * F.towerHeights[b.char];
      const yTop = b.y - ext;
      const ta = 0.05 + 0.08 * i, tb = ta + 0.32; // la torre crece de abajo hacia arriba
      // Cuerpo de la torre: dos lados.
      seg(xl, b.y, xl, yTop, ta, tb, 'tower');
      seg(xr, b.y, xr, yTop, ta, tb, 'tower');
      // Remate: almenas o mástil con banderín.
      const t1 = tb, t2 = tb + 0.1;
      if (F.towerCrown[b.char] === 'crenels') {
        const n = 3, mw = tw / (2 * n - 1), mh = b.h * 0.14;
        let x = xl;
        for (let m = 0; m < n; m++) {
          seg(x, yTop, x, yTop - mh, t1, t2, 'crown');
          seg(x, yTop - mh, x + mw, yTop - mh, t1, t2, 'crown');
          seg(x + mw, yTop - mh, x + mw, yTop, t1, t2, 'crown');
          if (m < n - 1) seg(x + mw, yTop, x + 2 * mw, yTop, t1, t2, 'crown');
          x += 2 * mw;
        }
      } else {
        seg(xl, yTop, xr, yTop, t1, t2, 'crown');
        const mast = b.h * 0.6;
        seg(cx, yTop, cx, yTop - mast, t1, t2 + 0.05, 'mast');
        // Banderín: tres trazos; el extremo se mueve en update (onda).
        segs.push({ x0: cx, y0: yTop - mast, x1: cx + tw * 0.7, y1: yTop - mast * 0.85,
          ta: t2, tb: t2 + 0.05, kind: 'flag', bx: cx + tw * 0.7, by: yTop - mast * 0.85, ph: i });
        seg(cx, yTop - mast * 0.7, cx + tw * 0.7, yTop - mast * 0.85, t2, t2 + 0.05, 'flagb');
      }
      // Ventanas: dos o tres puntos cálidos en la torre.
      const nw = 2 + (i % 2);
      for (let k = 0; k < nw; k++) {
        dots.push({ x: cx + (k % 2 ? 0.1 : -0.1) * tw, y: yTop + ext * (0.2 + 0.25 * k), ta: 0.7 + 0.04 * (i + k), kind: 'window' });
      }
    });

    // Muros: unen torres vecinas por arriba de las letras, con almenas pequeñas.
    const wallY = (b) => b.y - b.h * F.wallHeight;
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i], c = boxes[i + 1];
      const xa = a.x + a.w / 2 + (a.w * F.towerWidths[a.char]) / 2;
      const xc = c.x + c.w / 2 - (c.w * F.towerWidths[c.char]) / 2;
      const y = Math.min(wallY(a), wallY(c));
      const ta = 0.52 + 0.04 * i, tb = ta + 0.1;
      seg(xa, y, xc, y, ta, tb, 'wall');
      const n = Math.max(2, Math.round((xc - xa) / (a.h * 0.16)));
      for (let m = 0; m < n; m++) {
        const x = xa + ((m + 0.25) / n) * (xc - xa), mw = ((xc - xa) / n) * 0.5, mh = a.h * 0.07;
        seg(x, y, x, y - mh, tb, tb + 0.04, 'wall');
        seg(x, y - mh, x + mw, y - mh, tb, tb + 0.04, 'wall');
        seg(x + mw, y - mh, x + mw, y, tb, tb + 0.04, 'wall');
      }
    }
    // Línea de suelo bajo las letras.
    const first = boxes[0], last = boxes[boxes.length - 1];
    const gy = first.y + first.h + first.h * 0.06;
    seg(first.x, gy, last.x + last.w, gy, 0.5, 0.75, 'wall');

    // Puerta: la panza de la D se llena de luz cálida.
    const D = boxes[0];
    dots.push({ x: D.x + D.w * 0.55, y: D.y + D.h * 0.5, ta: 0.82, kind: 'door' });

    // Geometría: líneas (dinámicas) y puntos (ventanas, puerta, y puntos sobre las líneas).
    const linePos = new Float32Array(segs.length * 6);
    const lineCol = new Float32Array(segs.length * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    lines.frustumCulled = false;

    const dotPos = new Float32Array(dots.length * 3), dotCol = new Float32Array(dots.length * 3);
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
    dotGeo.setAttribute('color', new THREE.BufferAttribute(dotCol, 3));
    dots.forEach((d, i) => { dotPos[i * 3] = d.x; dotPos[i * 3 + 1] = d.y; });
    const dotObj = new THREE.Points(dotGeo, new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 12, sizeAttenuation: false,
    }));
    dotObj.frustumCulled = false;

    group.clear();
    group.add(lines, dotObj);
    castle = { segs, dots, linePos, lineCol, lineGeo, dotPos, dotCol, dotGeo, dotObj, boxes };
  }

  // Dibuja el castillo con progreso p (0..1), brillo global g y tiempo s (para el ondeo).
  function drawCastle(p, g, s) {
    const c = castle;
    if (!c) return;
    c.segs.forEach((sg, i) => {
      const u = clamp01((p - sg.ta) / (sg.tb - sg.ta));
      let x1 = sg.x1, y1 = sg.y1;
      if (sg.kind === 'flag' || sg.kind === 'flagb') y1 += Math.sin(s * 3 + (sg.ph || 0)) * 3; // ondea
      const ex = sg.x0 + (x1 - sg.x0) * u, ey = sg.y0 + (y1 - sg.y0) * u;
      c.linePos[i * 6] = sg.x0; c.linePos[i * 6 + 1] = sg.y0; c.linePos[i * 6 + 2] = 0;
      c.linePos[i * 6 + 3] = ex; c.linePos[i * 6 + 4] = ey; c.linePos[i * 6 + 5] = 0;
      const warm = sg.kind === 'tower' || sg.kind === 'crown' ? 0.55 : 0.3;
      tmp.copy(amber).lerp(gold, warm);
      const b = u > 0 ? g * 0.85 : 0;
      c.lineCol[i * 6] = tmp.r * b; c.lineCol[i * 6 + 1] = tmp.g * b; c.lineCol[i * 6 + 2] = tmp.b * b;
      c.lineCol[i * 6 + 3] = tmp.r * b * 0.6; c.lineCol[i * 6 + 4] = tmp.g * b * 0.6; c.lineCol[i * 6 + 5] = tmp.b * b * 0.6;
    });
    c.dots.forEach((d, i) => {
      const on = smooth(d.ta, d.ta + 0.1, p);
      const tw = 0.7 + 0.3 * Math.sin(s * 1.6 + i * 1.7);
      const size = d.kind === 'door' ? 1.6 : 1;
      tmp.copy(amber).lerp(gold, 0.7);
      const b = on * g * tw * size;
      c.dotCol[i * 3] = tmp.r * b; c.dotCol[i * 3 + 1] = tmp.g * b; c.dotCol[i * 3 + 2] = tmp.b * b;
    });
    c.lineGeo.attributes.position.needsUpdate = true;
    c.lineGeo.attributes.color.needsUpdate = true;
    c.dotGeo.attributes.color.needsUpdate = true;
  }

  function reset(now) {
    group.clear();
    castle = null;
    letters.reset();
    letters.layout(window.innerWidth, window.innerHeight);
    phase = 'play'; t0 = now;
  }

  // Dev: despierta las seis a la vez para probar el final sin jugar todo.
  function forceAwakenAll() { letters.letters.forEach((l) => l.awaken()); }

  let lift = 0, warmth = 0;
  function update(dtMs, now, input) {
    // Actividad: movimiento del punto de atención (para el reinicio por inactividad).
    if (Math.hypot(input.x - lastX, input.y - lastY) > 2 || input.grab) lastActivity = now;
    lastX = input.x; lastY = input.y;
    lift = 0; warmth = 0;
    const s = now / 1000;

    switch (phase) {
      case 'play':
        if (letters.letters.every((l) => l.state === 'awake')) startConverge(now);
        break;
      case 'converge':
        stepConverge(now);
        break;
      case 'silence':
        if (now - t0 >= F.silenceMs) { unsilence(); phase = 'reveal'; t0 = now; }
        break;
      case 'reveal': {
        const p = clamp01((now - t0) / F.revealMs);
        drawCastle(p, smooth(0, 0.05, p), s);
        lift = CONFIG.finale.castleLift * smooth(0.3, 1, p);
        warmth = CONFIG.finale.castleWarmth * smooth(0.3, 1, p);
        if (p >= 1) { phase = 'rest'; t0 = now; lastActivity = now; }
        break;
      }
      case 'rest': {
        const breath = 0.85 + 0.15 * Math.sin(s * 1.1);
        drawCastle(1, breath, s);
        lift = CONFIG.finale.castleLift;
        warmth = CONFIG.finale.castleWarmth;
        if (idleResetEnabled() && now - lastActivity >= F.idleResetMs) { phase = 'closing'; t0 = now; }
        break;
      }
      case 'closing': {
        const k = clamp01((now - t0) / F.closingMs);
        drawCastle(1, 1 - ease(k), s);
        lift = CONFIG.finale.castleLift * (1 - k);
        warmth = CONFIG.finale.castleWarmth * (1 - k);
        if (k >= 1) reset(now);
        break;
      }
      default: break;
    }
  }

  return {
    update,
    forceAwakenAll,
    lift: () => lift,
    warmth: () => warmth,
    phase: () => phase,
  };
}
