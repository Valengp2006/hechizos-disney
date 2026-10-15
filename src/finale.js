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

export function createFinale({ scene, letters, onReset = () => {} }) {
  const F = CONFIG.finale;
  const group = new THREE.Group();
  // Orden de dibujo por grupo (antes que el relleno de las letras, que está en el grupo -2).
  group.renderOrder = -10;
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
    // En el final la guía ya no se muestra, así que el castillo usa toda la altura.
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
    // Rellenos: rectángulos que crecen desde `yb` hasta `yt` y triángulos que se "abren" desde su base.
    const rects = []; // {x0,x1,yb,yt,ta,tb,k}
    const tris = [];  // {pts:[[x,y]x3], ta, tb, k}
    const rect = (x0, x1, yb, yt, ta, tb, k = 'solid') => rects.push({ x0, x1, yb, yt, ta, tb, k });

    boxes.forEach((b, i) => {
      const cx = b.x + b.w / 2;
      const tw = b.w * F.towerWidths[b.char];
      const xl = cx - tw / 2, xr = cx + tw / 2;
      const ext = b.h * F.towerHeights[b.char];
      const yTop = b.y - ext;
      const ta = 0.05 + 0.08 * i, tb = ta + 0.32; // la torre crece de abajo hacia arriba
      // Silueta de la torre: apoya sobre el borde superior de la letra, con un solape pequeño.
      rect(xl, xr, b.y + 0.12 * b.h, yTop, ta, tb);
      // Cuerpo de la torre: dos lados.
      seg(xl, b.y, xl, yTop, ta, tb, 'tower');
      seg(xr, b.y, xr, yTop, ta, tb, 'tower');
      // Remate: almenas o mástil con banderín.
      const t1 = tb, t2 = tb + 0.1;
      if (F.towerCrown[b.char] === 'crenels') {
        const n = 3, mw = tw / (2 * n - 1), mh = b.h * 0.14;
        let x = xl;
        for (let m = 0; m < n; m++) {
          rect(x, x + mw, yTop + 1, yTop - mh, t1, t2);
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
        // Banderín relleno: un triángulo que ondea en la punta del mástil.
        tris.push({
          pts: [[cx, yTop - mast], [cx + tw * 0.78, yTop - mast + mast * 0.1], [cx, yTop - mast + mast * 0.3]],
          ta: t2 + 0.02, tb: t2 + 0.1, k: 'flag', ph: i,
        });
        // Banderín: tres trazos; el extremo se mueve en update (onda).
        segs.push({ x0: cx, y0: yTop - mast, x1: cx + tw * 0.7, y1: yTop - mast * 0.85,
          ta: t2, tb: t2 + 0.05, kind: 'flag', bx: cx + tw * 0.7, by: yTop - mast * 0.85, ph: i });
        seg(cx, yTop - mast * 0.7, cx + tw * 0.7, yTop - mast * 0.85, t2, t2 + 0.05, 'flagb');
      }
      // Ventanas: dos o tres puntos cálidos en la torre.
      const nw = 2 + (i % 2);
      for (let k = 0; k < nw; k++) {
        const wx = cx + (k % 2 ? 0.1 : -0.1) * tw, wy = yTop + ext * (0.2 + 0.25 * k);
        const wtA = 0.7 + 0.04 * (i + k);
        dots.push({ x: wx, y: wy, ta: wtA, kind: 'window' });
        // Ventana encendida: un rectángulo cálido con la punta arriba.
        const ws = Math.max(4, 0.09 * tw);
        rect(wx - ws * 0.5, wx + ws * 0.5, wy + ws * 0.9, wy - ws * 0.9, wtA, wtA + 0.1, 'window');
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
      rect(xa, xc, Math.max(a.y, c.y) + 0.12 * a.h, y, ta, tb);         // el muro, relleno
      const n = Math.max(2, Math.round((xc - xa) / (a.h * 0.16)));
      for (let m = 0; m < n; m++) {
        const x = xa + ((m + 0.25) / n) * (xc - xa), mw = ((xc - xa) / n) * 0.5, mh = a.h * 0.07;
        rect(x, x + mw, y + 1, y - mh, tb, tb + 0.04);
        seg(x, y, x, y - mh, tb, tb + 0.04, 'wall');
        seg(x, y - mh, x + mw, y - mh, tb, tb + 0.04, 'wall');
        seg(x + mw, y - mh, x + mw, y, tb, tb + 0.04, 'wall');
      }
    }
    // Línea de suelo bajo las letras.
    const first = boxes[0], last = boxes[boxes.length - 1];
    const gy = first.y + first.h + first.h * 0.06;
    seg(first.x, gy, last.x + last.w, gy, 0.5, 0.75, 'wall');

    // Puerta: un arco iluminado dentro de la panza de la D (se ve a través del hueco de la letra).
    const D = boxes[0];
    dots.push({ x: D.x + D.w * 0.55, y: D.y + D.h * 0.5, ta: 0.82, kind: 'door' });
    {
      const dw = 0.3 * D.w, dcx = D.x + 0.56 * D.w;
      const yb = D.y + 0.8 * D.h, yBody = D.y + 0.46 * D.h;
      rect(dcx - dw / 2, dcx + dw / 2, yb, yBody, 0.82, 0.93, 'door');
      for (let k = 0; k < 10; k++) {                 // medio círculo arriba, en abanico
        const a0 = Math.PI + (k / 10) * Math.PI, a1 = Math.PI + ((k + 1) / 10) * Math.PI;
        tris.push({
          pts: [[dcx, yBody], [dcx + Math.cos(a0) * dw / 2, yBody + Math.sin(a0) * dw / 2],
                [dcx + Math.cos(a1) * dw / 2, yBody + Math.sin(a1) * dw / 2]],
          ta: 0.88, tb: 0.95, k: 'door', ph: 0,
        });
      }
    }

    // Capa lejana: colinas suaves y torres pequeñas, más claras, detrás del castillo.
    const farPos = [], farCol = [];
    if (F.farLayer) {
      const W = window.innerWidth;
      const gyF = first.y + first.h * 1.02;        // sobre la línea del suelo
      const lin = (q) => Math.max(0, q) ** 2.2;
      const push = (x, y, c) => { farPos.push(x, y, 0); farCol.push(lin(c[0]), lin(c[1]), lin(c[2])); };
      const T = F.farTop, Bm = F.farBottom;
      // Colinas: una cresta con dos senos (determinista), de lado a lado de la pantalla.
      const hillH = (x) => first.h * (0.55 + 0.28 * Math.sin(x * 0.0061 + 1.2) + 0.17 * Math.sin(x * 0.0137 + 0.4));
      const stepX = 24;
      for (let x = -stepX; x < W + stepX; x += stepX) {
        const y0 = gyF - hillH(x), y1 = gyF - hillH(x + stepX);
        push(x, gyF + first.h * 0.5, Bm); push(x + stepX, gyF + first.h * 0.5, Bm); push(x + stepX, y1, T);
        push(x, gyF + first.h * 0.5, Bm); push(x + stepX, y1, T); push(x, y0, T);
      }
      // Torres lejanas: pequeñas, a intervalos irregulares fijos, con una almena o un mástil.
      for (let i = 0; i < 9; i++) {
        const fx = ((i + 0.5 + 0.6 * Math.sin(i * 2.3)) / 9) * W;
        const tw = first.h * (0.16 + 0.07 * ((i * 7) % 3));
        const th = first.h * (0.9 + 0.5 * ((i * 5) % 4) / 3);
        const yb = gyF - hillH(fx) + first.h * 0.15, yt = yb - th;
        push(fx - tw / 2, yb, Bm); push(fx + tw / 2, yb, Bm); push(fx + tw / 2, yt, T);
        push(fx - tw / 2, yb, Bm); push(fx + tw / 2, yt, T); push(fx - tw / 2, yt, T);
        if (i % 2 === 0) {                          // almenas
          const mw = tw / 5;
          for (let m = 0; m < 3; m++) {
            const x0 = fx - tw / 2 + m * 2 * mw, ym = yt - first.h * 0.07;
            push(x0, yt, T); push(x0 + mw, yt, T); push(x0 + mw, ym, T);
            push(x0, yt, T); push(x0 + mw, ym, T); push(x0, ym, T);
          }
        } else {                                    // aguja fina con un pequeño remate
          const yp = yt - first.h * 0.5;
          push(fx - tw * 0.12, yt, T); push(fx + tw * 0.12, yt, T); push(fx, yp, T);
        }
      }
    }

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

    // Rellenos: una malla de triángulos con color por vértice (calor abajo, violeta arriba).
    const nv = rects.length * 6 + tris.length * 3;
    const fillPos = new Float32Array(nv * 3), fillCol = new Float32Array(nv * 3);
    const fillGeo = new THREE.BufferGeometry();
    fillGeo.setAttribute('position', new THREE.BufferAttribute(fillPos, 3));
    fillGeo.setAttribute('color', new THREE.BufferAttribute(fillCol, 3));
    const fillMat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: F.castleFill, depthWrite: false, side: THREE.DoubleSide,
    });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.frustumCulled = false;
    fillMesh.renderOrder = -6; // detrás de las letras y de las líneas

    // Niebla cálida al pie: un halo ancho y bajo sobre la línea del suelo.
    const mistPos = new Float32Array(boxes.length * 3), mistCol = new Float32Array(boxes.length * 3);
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    mistGeo.setAttribute('color', new THREE.BufferAttribute(mistCol, 3));
    boxes.forEach((b, i) => { mistPos[i * 3] = b.x + b.w / 2; mistPos[i * 3 + 1] = b.y + b.h * 1.25; });
    const mistObj = new THREE.Points(mistGeo, new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size: Math.max(160, boxes[0].w * 3.2), sizeAttenuation: false,
    }));
    mistObj.frustumCulled = false; mistObj.renderOrder = -7;

    // Capa lejana: malla estática (solo cambia su opacidad al revelarse).
    let farMesh = null, farMat = null;
    if (farPos.length) {
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(farPos), 3));
      fg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(farCol), 3));
      farMat = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
      });
      farMesh = new THREE.Mesh(fg, farMat);
      farMesh.frustumCulled = false; farMesh.renderOrder = -8; // la más atrás de todo el castillo
    }

    group.clear();
    if (farMesh) group.add(farMesh);
    group.add(mistObj, fillMesh, lines, dotObj);
    castle = {
      segs, dots, linePos, lineCol, lineGeo, dotPos, dotCol, dotGeo, dotObj, boxes,
      rects, tris, fillPos, fillCol, fillGeo, fillMat, mistCol, mistGeo, farMat,
    };
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

    // Siluetas rellenas: cada rectángulo crece de su base a su tope según el progreso.
    const top = F.castleTop, bot = F.castleBottom;
    let v = 0;
    // Los colores de config están pensados como se ven (sRGB); el material los trata como
    // lineales y los aclararía, así que se convierten.
    const lin = (q) => Math.max(0, q) ** 2.2;
    const put = (x, y, r, g, b) => {
      c.fillPos[v * 3] = x; c.fillPos[v * 3 + 1] = y; c.fillPos[v * 3 + 2] = 0;
      c.fillCol[v * 3] = lin(r); c.fillCol[v * 3 + 1] = lin(g); c.fillCol[v * 3 + 2] = lin(b);
      v++;
    };
    for (const r of c.rects) {
      const u = ease((p - r.ta) / Math.max(0.001, r.tb - r.ta));
      const yt = r.yb + (r.yt - r.yb) * u;
      if (r.k === 'door') { // puerta: luz cálida (más clara arriba), con un leve latido
        const br = 0.9 + 0.1 * Math.sin(s * 1.3);
        put(r.x0, r.yb, 1.0 * br * u, 0.60 * br * u, 0.26 * br * u); put(r.x1, r.yb, 1.0 * br * u, 0.60 * br * u, 0.26 * br * u);
        put(r.x1, yt, 1.0 * br * u, 0.84 * br * u, 0.50 * br * u);
        put(r.x0, r.yb, 1.0 * br * u, 0.60 * br * u, 0.26 * br * u); put(r.x1, yt, 1.0 * br * u, 0.84 * br * u, 0.50 * br * u);
        put(r.x0, yt, 1.0 * br * u, 0.84 * br * u, 0.50 * br * u);
        continue;
      }
      if (r.k === 'window') { // ventana encendida: dorado cálido, con un leve parpadeo
        const tw = 0.85 + 0.15 * Math.sin(s * 1.7 + r.x0);
        const cr = 1.0 * tw * u, cg = 0.80 * tw * u, cb = 0.42 * tw * u;
        put(r.x0, r.yb, cr, cg, cb); put(r.x1, r.yb, cr, cg, cb); put(r.x1, yt, cr, cg, cb);
        put(r.x0, r.yb, cr, cg, cb); put(r.x1, yt, cr, cg, cb); put(r.x0, yt, cr, cg, cb);
        continue;
      }
      // Abajo calor de las letras; arriba violeta profundo (la silueta se funde con el cielo).
      put(r.x0, r.yb, bot[0], bot[1], bot[2]); put(r.x1, r.yb, bot[0], bot[1], bot[2]); put(r.x1, yt, top[0], top[1], top[2]);
      put(r.x0, r.yb, bot[0], bot[1], bot[2]); put(r.x1, yt, top[0], top[1], top[2]); put(r.x0, yt, top[0], top[1], top[2]);
    }
    for (const t of c.tris) {
      const u = ease((p - t.ta) / Math.max(0.001, t.tb - t.ta));
      const [a, b, d] = t.pts;
      const w = Math.sin(s * 3 + t.ph) * 3;       // el banderín ondea
      const f = (q, dy = 0) => [a[0] + (q[0] - a[0]) * u, a[1] + (q[1] - a[1]) * u + dy];
      if (t.k === 'door') { // arco de la puerta: centro claro, borde más cálido
        const br = (0.9 + 0.1 * Math.sin(s * 1.3)) * u;
        put(a[0], a[1], 1.0 * br, 0.84 * br, 0.5 * br);
        put(b[0], b[1], 1.0 * br, 0.62 * br, 0.28 * br); put(d[0], d[1], 1.0 * br, 0.62 * br, 0.28 * br);
        continue;
      }
      const A = f(a), B = f(b, w), D = f(d, w * 0.5);
      put(A[0], A[1], 0.78, 0.30, 0.46); put(B[0], B[1], 1.0, 0.72, 0.38); put(D[0], D[1], 0.62, 0.22, 0.40);
    }
    c.fillGeo.attributes.position.needsUpdate = true;
    c.fillGeo.attributes.color.needsUpdate = true;
    c.fillMat.opacity = F.castleFill * Math.min(1, g);
    // La capa lejana aparece primero y despacio, como una bruma de fondo.
    if (c.farMat) c.farMat.opacity = F.farFill * ease(p / 0.45) * Math.min(1, g);
    // Niebla al pie: sube con la revelación y respira.
    const mAmt = F.castleMist * smooth(0.5, 1, p) * Math.min(1, g) * (0.85 + 0.15 * Math.sin(s * 0.9));
    for (let i = 0; i < c.boxes.length; i++) {
      c.mistCol[i * 3] = 0.9 * mAmt; c.mistCol[i * 3 + 1] = 0.5 * mAmt; c.mistCol[i * 3 + 2] = 0.35 * mAmt;
    }
    c.mistGeo.attributes.color.needsUpdate = true;
  }

  function reset(now) {
    group.clear();
    castle = null;
    letters.reset();
    letters.layout(window.innerWidth, window.innerHeight);
    phase = 'play'; t0 = now;
    onReset(now); // el inicio de cuento vuelve para el siguiente visitante
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
    // En el final los objetos quedan plenamente iluminados (no dependen del cursor).
    letters.letters.forEach((l) => { l.alwaysLit = phase !== 'play'; });

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
