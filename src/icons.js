// icons.js — el objeto en que se convierte cada letra al despertar.
//   D campana · I vela · S cinta · N estrella · E arpa · Y flor sobre tallo
// El objeto es el RELLENO de la propia letra (así sigue leyéndose) más pocos detalles
// geométricos (asa, llama, rayos...). Cada pieza tiene color propio; se ilumina según la
// cercanía del cursor y, lejos de él, queda en penumbra. Todo en coordenadas locales de la
// letra (la caja de la letra es [0,w] x [0,h]; y crece hacia abajo).
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haloTexture } from './render.js';

const DEG = Math.PI / 180;

// Convierte los contornos de la letra en formas con agujeros (la panza de la D, etc.).
function glyphShapes(contours) {
  const area = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2;
  };
  const items = contours.filter((c) => c.points.length > 2).map((c) => ({
    pts: c.points.map((p) => new THREE.Vector2(p.x, p.y)), a: area(c.points),
  }));
  if (!items.length) return [];
  const outerSign = Math.sign(items.reduce((m, it) => (Math.abs(it.a) > Math.abs(m.a) ? it : m), items[0]).a);
  const outers = items.filter((it) => Math.sign(it.a) === outerSign).map((it) => new THREE.Shape(it.pts));
  items.filter((it) => Math.sign(it.a) !== outerSign).forEach((hole) => {
    // El agujero va en la forma exterior cuya caja contiene su primer punto.
    const target = outers.find((s) => {
      const xs = s.getPoints().map((p) => p.x), ys = s.getPoints().map((p) => p.y);
      const p0 = hole.pts[0];
      return p0.x >= Math.min(...xs) && p0.x <= Math.max(...xs) && p0.y >= Math.min(...ys) && p0.y <= Math.max(...ys);
    }) || outers[0];
    target.holes.push(new THREE.Path(hole.pts));
  });
  return outers;
}

// Grano de papel: ruido determinista en gris claro que modula el color del relleno.
let grain = null;
function grainTexture() {
  if (grain) return grain;
  const n = 96, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d'), img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Dos octavas de ruido de valor, deterministas.
      const h1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; const a = h1 - Math.floor(h1);
      const h2 = Math.sin((x >> 2) * 39.346 + (y >> 2) * 11.135) * 24634.634; const b = h2 - Math.floor(h2);
      const v = 255 * (1 - CONFIG.icons.grain * (0.65 * a + 0.35 * b));
      const k = (y * n + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(1 / 42, 1 / 42);
  return grain;
}

export function createIcon(letter) {
  const { contours, width: w, height: h } = letter.shape;
  const u = h; // unidad de tamaño de los detalles (alto de la letra)
  const group = new THREE.Group();
  group.renderOrder = -2; // el relleno va detrás del contorno y los puntos
  const parts = []; // {mat, base, glow, flicker, obj}

  // DoubleSide: con el eje y hacia abajo los triángulos quedan con la cara al revés.
  const mkMat = (hex) => new THREE.MeshBasicMaterial({
    color: new THREE.Color(hex), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const add = (obj, mat, base, extra = {}) => {
    obj.renderOrder = -2;
    group.add(obj);
    parts.push({ mat, base: new THREE.Color(base), ...extra });
    return obj;
  };
  const IC = CONFIG.icons;
  const fill = (shapes, hex, extra) => {
    const mat = mkMat(hex);
    const geo = new THREE.ShapeGeometry(shapes);
    if (extra && extra.shade) {
      // Sombreado: luz desde arriba a la izquierda (más claro arriba, más oscuro abajo).
      const pos = geo.attributes.position, n = pos.count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const ty = Math.min(1, Math.max(0, pos.getY(i) / Math.max(1, h)));
        const tx = Math.min(1, Math.max(0, pos.getX(i) / Math.max(1, w)));
        const v = Math.max(0.15, 1 + IC.shading * (0.45 - ty * 0.9) + IC.shading * 0.12 * (0.5 - tx));
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      mat.vertexColors = true;
      if (IC.grain > 0) { mat.map = grainTexture(); }
    }
    return add(new THREE.Mesh(geo, mat), mat, hex, extra);
  };
  const poly = (pts, hex, extra) => fill(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), hex, extra);
  const disc = (cx, cy, r, hex, extra) => {
    const mat = mkMat(hex);
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), mat);
    m.position.set(cx, cy, 0);
    return add(m, mat, hex, extra);
  };
  const line = (pts, hex, extra) => {
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0, depthWrite: false });
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    return add(new THREE.Line(g, mat), mat, hex, extra);
  };
  const segs = (pairs, hex) => {
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0, depthWrite: false });
    const g = new THREE.BufferGeometry();
    g.setFromPoints(pairs.flatMap(([a, b]) => [new THREE.Vector3(a[0], a[1], 0), new THREE.Vector3(b[0], b[1], 0)]));
    return add(new THREE.LineSegments(g, mat), mat, hex);
  };

  const base = CONFIG.icons.colors[letter.char] || '#ffffff';
  // Aura cálida detrás de la letra (se ve al despertar), para que no sea un recorte plano.
  const auraMat = new THREE.PointsMaterial({
    map: haloTexture(), color: new THREE.Color('#ffc46b'), transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 10, sizeAttenuation: false,
  });
  const auraGeo = new THREE.BufferGeometry();
  auraGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.5 * w, 0.5 * h, 0]), 3));
  const aura = new THREE.Points(auraGeo, auraMat);
  aura.renderOrder = -3; aura.frustumCulled = false;
  group.add(aura);
  // El relleno de la propia letra, con luz y sombra y grano de papel.
  fill(glyphShapes(contours), base, { shade: true });
  // Brillo de borde: el contorno desplazado hacia arriba-izquierda, en un tono claro.
  if (IC.rim > 0) {
    const d = 0.016 * u;
    contours.forEach((c) => {
      if (c.points.length < 3) return;
      const pts = c.points.map((p) => [p.x - d, p.y - d]);
      if (c.closed) pts.push(pts[0]);
      line(pts, '#fff0c8', { rim: true });
    });
  }

  switch (letter.char) {
    case 'D': { // campana: asa arriba, badajo colgando en la panza
      const ring = [];
      for (let a = 180; a <= 360; a += 15) ring.push([0.32 * w + Math.cos(a * DEG) * 0.14 * w, -0.01 * u + Math.sin(a * DEG) * 0.1 * u]);
      line(ring, '#f6d27a');
      line([[0.58 * w, 0.27 * h], [0.58 * w, 0.56 * h]], '#f6d27a');
      disc(0.58 * w, 0.62 * h, 0.075 * u, '#f6d27a');
      break;
    }
    case 'I': { // vela: soporte de latón, mecha, llama y gotas de cera
      poly([[-0.7 * w, 1.0 * h], [1.7 * w, 1.0 * h], [1.55 * w, 1.07 * h], [-0.55 * w, 1.07 * h]], '#e9b44c');
      line([[0.5 * w, 0], [0.5 * w, -0.07 * u]], '#8a6a3a');
      const flame = [[0, -0.34], [0.065, -0.24], [0.075, -0.15], [0, -0.075], [-0.075, -0.15], [-0.065, -0.24]];
      poly(flame.map(([x, y]) => [0.5 * w + x * u, y * u]), '#ffb347', { glow: 1.25, flicker: 0 });
      const inner = [[0, -0.26], [0.035, -0.19], [0.04, -0.13], [0, -0.1], [-0.04, -0.13], [-0.035, -0.19]];
      poly(inner.map(([x, y]) => [0.5 * w + x * u, y * u]), '#fff1b0', { glow: 1.4, flicker: 1 });
      disc(0.18 * w, 0.05 * h, 0.03 * u, '#fff6dc');
      disc(0.82 * w, 0.1 * h, 0.035 * u, '#fff6dc');
      break;
    }
    case 'S': { // cinta: relleno coral con un lazo en la punta de abajo
      disc(0.08 * w, 0.93 * h, 0.05 * u, '#ffd0d4');
      disc(0.92 * w, 0.07 * h, 0.04 * u, '#ffd0d4');
      break;
    }
    case 'N': { // estrella de cuatro puntas al centro y destellos
      const star = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 - 90) * DEG, r = i % 2 === 0 ? 0.24 * u : 0.075 * u;
        star.push([0.5 * w + Math.cos(a) * r, 0.5 * h + Math.sin(a) * r]);
      }
      poly(star, '#fff4c4', { glow: 1.3 });
      disc(1.05 * w, 0.06 * h, 0.025 * u, '#fff4c4');
      disc(-0.05 * w, 0.9 * h, 0.025 * u, '#fff4c4');
      break;
    }
    case 'E': { // arpa: cuello curvo sobre el marco, clavijas en las puntas y notas
      const neck = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, mt = 1 - t;
        // Curva cuadrática del arranque del asta a la punta del brazo superior, por encima.
        neck.push([mt * mt * 0.08 * w + 2 * mt * t * 0.5 * w + t * t * 0.98 * w,
                   mt * mt * 0.0 * h + 2 * mt * t * (-0.3 * u) + t * t * 0.1 * h]);
      }
      line(neck, '#f6d27a');
      line(neck.map(([x, y]) => [x, y - 0.012 * u]), '#f6d27a'); // doble trazo: más cuerpo
      // Clavijas (puntas de las cuerdas) y pie del marco.
      [0.1, 0.5, 0.92].forEach((fy) => disc(0.99 * w, fy * h, 0.028 * u, '#fff6dc'));
      poly([[-0.1 * w, 1.0 * h], [0.9 * w, 1.0 * h], [0.8 * w, 1.07 * h], [0.0 * w, 1.07 * h]], '#e9b44c');
      // Notas que flotan: cabeza y plica.
      disc(1.1 * w, 0.3 * h, 0.03 * u, '#ffe27a', { glow: 1.3 });
      line([[1.1 * w + 0.03 * u, 0.3 * h], [1.1 * w + 0.03 * u, 0.3 * h - 0.1 * u]], '#ffe27a');
      disc(1.25 * w, 0.62 * h, 0.025 * u, '#ffe27a', { glow: 1.3 });
      line([[1.25 * w + 0.025 * u, 0.62 * h], [1.25 * w + 0.025 * u, 0.62 * h - 0.09 * u]], '#ffe27a');
      break;
    }
    case 'Y': { // flor en la bifurcación y hojas en las puntas de los brazos
      const leaf = (x, y, rot) => {
        const pts = [];
        for (let a = 0; a < 360; a += 30) pts.push([Math.cos(a * DEG) * 0.05 * u, Math.sin(a * DEG) * 0.11 * u]);
        const c = Math.cos(rot * DEG), s = Math.sin(rot * DEG);
        poly(pts.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]), '#7ed69a');
      };
      leaf(0.02 * w, 0.0 * h, -25);
      leaf(0.98 * w, 0.0 * h, 25);
      const fx = 0.5 * w, fy = 0.26 * h;
      for (let i = 0; i < 6; i++) {
        const a = i * 60 * DEG;
        disc(fx + Math.cos(a) * 0.075 * u, fy + Math.sin(a) * 0.075 * u, 0.05 * u, '#f48fb1');
      }
      disc(fx, fy, 0.04 * u, '#ffd25e', { glow: 1.2 });
      break;
    }
    default: break;
  }

  // fillOp: 0..1 (cuánto se ha rellenado); light: 0..1 (cuánta luz recibe); t: segundos.
  function update(fillOp, light, t) {
    group.visible = fillOp > 0.01;
    if (!group.visible) return;
    for (const p of parts) {
      const g = (p.glow || 1) * (p.flicker !== undefined ? 1 + 0.12 * Math.sin(t * 9 + p.flicker * 2) : 1);
      p.mat.color.copy(p.base).multiplyScalar(Math.min(1.4, light * g));
      p.mat.opacity = p.rim ? fillOp * IC.rim * Math.min(1, light) : fillOp;
    }
    // Aura: crece con la luz que recibe la letra y respira despacio.
    auraMat.size = Math.min(520, 2.4 * h * letter.scale);
    auraMat.opacity = IC.aura * fillOp * (0.55 + 0.45 * light) * (0.85 + 0.15 * Math.sin(t * 1.3));
  }

  return { group, update };
}
