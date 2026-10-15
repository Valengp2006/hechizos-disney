// spells/d.js — Hechizo de la D: PORTAL (gesto: círculo).
//
// La panza de la D se abre y su propio contorno se repite hacia el fondo, cada copia
// más pequeña y girada que la anterior, hasta un punto de fuga dentro de la letra.
// Todo sale de la D: solo copias escaladas y rotadas de su contorno y sus puntos.
//
// Línea de tiempo (k = 0..1 sobre spells.durationMs.D):
//   0 – 0.25  apertura: el túnel se despliega (más copias y más giro)
//   0.25–0.75 túnel: las copias "caen" hacia el fondo sin parar
//   0.75–1    cierre: el túnel se recoge y queda una copia pequeña girando
// Determinista: la escala y el giro de cada copia dependen solo de su profundidad.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { haloTexture } from '../render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createPortal(letter) {
  const cfg = CONFIG.spells;
  const { contours, points, width: w, height: h } = letter.shape;
  const cx = w / 2, cy = h / 2;
  const vp = { x: cfg.portalCenter.x * w, y: cfg.portalCenter.y * h };
  const N = cfg.portalCopies;
  const twist = (cfg.portalTwistDeg * Math.PI) / 180;
  const spin = (cfg.portalRemnantSpinDeg * Math.PI) / 180;

  // Geometría compartida: el contorno y sus puntos, centrados en el centro de la caja
  // para que cada copia escale y gire sobre su propio centro.
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

  // Una copia = grupo + material propio (cada una tiene su color y brillo).
  function makeCopy() {
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
    g.visible = false;
    group.add(g);
    return { g, lineMat, pointMat };
  }
  const copies = Array.from({ length: N }, makeCopy);
  const remnant = makeCopy();

  // Coloca una copia a la "profundidad" f (0 = grande/cerca, N = pequeña/fondo).
  function place(copy, f, opacity, color) {
    const s = cfg.portalScaleStep ** (f + 1);
    // El centro de la copia se desplaza hacia el punto de fuga a medida que se encoge.
    copy.g.position.set(cx + (vp.x - cx) * (1 - s), cy + (vp.y - cy) * (1 - s), 0);
    copy.g.scale.setScalar(s);
    copy.g.visible = opacity > 0.001;
    copy.lineMat.opacity = opacity;
    copy.pointMat.opacity = opacity * 0.6;
    copy.lineMat.color.copy(color);
    copy.pointMat.color.copy(color);
  }

  const tmp = new THREE.Color();
  const mix = (a, b, t) => tmp.copy(a).lerp(b, t);

  function reset() {
    copies.forEach((c) => { c.g.visible = false; c.lineMat.opacity = 0; c.pointMat.opacity = 0; });
    remnant.g.visible = false;
    remnant.lineMat.opacity = 0;
    remnant.pointMat.opacity = 0;
  }

  // k: progreso 0..1 del hechizo; ms: tiempo desde que empezó.
  function conjured(k, ms) {
    const open = smooth(0, 0.25, k);
    const close = smooth(0.75, 1, k);
    const phase = (ms / 1000) * cfg.portalFlow;
    const twistNow = twist * open; // el giro también se "abre" poco a poco

    for (let i = 0; i < N; i++) {
      const f = (i + phase) % N;           // profundidad continua: las copias caen y se reciclan
      const depth = f / N;                 // 0..1
      const visible = clamp01(open * N - f); // la apertura revela copias de cerca a lejos
      // Aparece suavemente al nacer y se apaga al llegar al fondo.
      const edge = Math.sin(Math.PI * clamp01(depth)) ** 0.7;
      const opacity = 0.7 * edge * visible * (1 - close);
      // Color: rosa al frente, ámbar al fondo, dorado en el último anillo.
      const base = mix(letter.cRose, letter.cAmber, depth).clone();
      const gold = smooth(0.6, 1, depth) * smooth(0.3, 0.8, k);
      place(copies[i], f, opacity, base.lerp(letter.cAwake, gold));
      copies[i].g.rotation.z = twistNow * (f + 1);
    }

    // Copia que queda: aparece al cierre en el punto de fuga y gira despacio.
    const rs = cfg.portalRemnantScale;
    remnant.g.position.set(vp.x, vp.y, 0);
    remnant.g.scale.setScalar(rs);
    remnant.g.rotation.z = (ms / 1000) * spin;
    remnant.g.visible = close > 0.001;
    remnant.lineMat.opacity = 0.9 * close;
    remnant.pointMat.opacity = 0.6 * close;
    remnant.lineMat.color.copy(letter.cAwake);
    remnant.pointMat.color.copy(letter.cAwake);

    // Estallido de luz al fondo cuando el túnel está pleno.
    const bump = Math.exp(-(((k - 0.7) / 0.1) ** 2));
    return {
      lineOp: smooth(0, 0.2, k),
      pointOp: 0.8 * smooth(0, 0.2, k),
      color: mix(letter.cRose, letter.cAwake, smooth(0.5, 1, k)).clone(),
      flashOp: 0.45 * bump,
      flashScale: 0.6 + 0.8 * bump,
    };
  }

  // Letra despierta: el portal ya se cerró; solo gira la copia pequeña.
  function awake(ms, breath) {
    copies.forEach((c) => { c.g.visible = false; c.lineMat.opacity = 0; c.pointMat.opacity = 0; });
    // Con la letra-objeto activa la D ya es una campana: la copia que gira sobraría.
    remnant.g.visible = !CONFIG.icons.enabled;
    remnant.g.position.set(vp.x, vp.y, 0);       // por si se despertó sin conjurar (dev)
    remnant.g.scale.setScalar(cfg.portalRemnantScale);
    remnant.g.rotation.z = ((ms + cfg.durationMs.D) / 1000) * spin;
    const op = 0.55 + 0.35 * breath;
    remnant.lineMat.opacity = op;
    remnant.pointMat.opacity = op * 0.6;
  }

  // El destello del letter.js se coloca en el punto de fuga de este hechizo.
  const anchor = { x: vp.x, y: vp.y };

  // Alcance (px de pantalla) de la luz que se derrama del portal: la usan los
  // encadenamientos para avivar a las letras vecinas ("la alegría se contagia").
  function reach() {
    const e = smooth(0.1, 0.7, letter.progress);
    return (0.3 + 1.3 * e) * 0.5 * Math.hypot(w, h) * letter.scale;
  }

  // Portal abierto: punto de fuga y radio de captura (px de pantalla), para encadenamientos.
  // Con el portal en plena apertura captura más; con la copia que queda girando, menos.
  function portal() {
    if (letter.state !== 'conjured' && letter.state !== 'awake') return null;
    const sc = letter.scale;
    return {
      x: letter.pos.x + vp.x * sc,
      y: letter.pos.y + vp.y * sc,
      r: 0.5 * Math.max(w, h) * sc * (letter.state === 'conjured' ? 1 : 0.5),
    };
  }

  return { conjured, awake, reset, reach, portal, anchor };
}
