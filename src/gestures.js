// gestures.js — reconocimiento de gestos por trayectoria. Lógica pura y determinista:
// la misma secuencia de muestras da siempre el mismo resultado. No toca el DOM.
//
// Cada frame se llama push(input, nowMs). El reconocedor guarda las últimas muestras
// (la ventana de tiempo), mide cada gesto y devuelve:
//   { fired: 'circle'|'rise'|'sweep'|'zigzag'|'still'|'grab'|null, report }
// `report` trae las métricas de todos los gestos y si pasan o no (para el panel dev).
// Qué número cuenta como "gesto" vive en CONFIG.gestures.
import { CONFIG } from './config.js';

// Factor sobre la distancia mínima de un trazo recto según su duración real: los gestos lentos
// (>= 0.7 s) usan el umbral relajado; los breves, uno 1.5 veces mayor.
const spanFactor = (pts) => (pts.length > 1 && pts[pts.length - 1].t - pts[0].t >= 700 ? 1 : 1.5);
const bbox = (pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
};

// Círculo: ángulo acumulado alrededor del centro de la caja, con radio casi constante.
function measureCircle(pts, cfg) {
  if (pts.length < 8) return { angle: 0, radiusVar: 0, radius: 0, aspect: 0, pass: false };
  const b = bbox(pts);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  let total = 0, prev = Math.atan2(pts[0].y - cy, pts[0].x - cx);
  const radii = [];
  for (const p of pts) {
    const a = Math.atan2(p.y - cy, p.x - cx);
    let d = a - prev;
    if (d > Math.PI) d -= 2 * Math.PI;      // desenvuelve el salto en ±π
    if (d < -Math.PI) d += 2 * Math.PI;
    total += d;
    prev = a;
    radii.push(Math.hypot(p.x - cx, p.y - cy));
  }
  const mean = radii.reduce((s, r) => s + r, 0) / radii.length;
  const variance = radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length;
  const angle = (Math.abs(total) * 180) / Math.PI;
  const radiusVar = mean > 0 ? Math.sqrt(variance) / mean : 1;
  // Redondez: un círculo ocupa una caja casi cuadrada; una línea o un vaivén, no.
  const aspect = Math.max(b.w, b.h) > 0 ? Math.min(b.w, b.h) / Math.max(b.w, b.h) : 0;
  return {
    angle, radiusVar, radius: mean, aspect,
    pass: angle >= cfg.circle.minAngleDeg && radiusVar <= cfg.circle.radiusTolerance &&
      mean >= cfg.circle.minRadius,
  };
}

// Subir: desplazamiento vertical dominante, poco vaivén y poco ancho. Se acepta hacia arriba o
// hacia abajo: la gente tiende a "frotar" arriba y abajo, y lo que importa es el trazo vertical.
function measureRise(pts, cfg) {
  if (pts.length < 2) return { distance: 0, lateral: 0, straight: 0, pass: false };
  const b = bbox(pts);
  const net = Math.abs(pts[pts.length - 1].y - pts[0].y);
  const lateral = net > 0 ? b.w / net : Infinity;
  const straight = b.h > 0 ? net / b.h : 0;
  // Un trazo lento (>= 0.7 s) puede ser corto; uno breve debe ser más largo (si no, el primer
  // cuarto de un círculo rápido pasaría por trazo recto).
  const need = cfg.rise.minDistance * spanFactor(pts);
  return {
    distance: net, lateral, straight,
    pass: net >= need && lateral <= cfg.rise.maxLateralRatio &&
      straight >= cfg.rise.minStraightness,
  };
}

// Barrido: desplazamiento horizontal dominante (cualquier sentido).
function measureSweep(pts, cfg) {
  if (pts.length < 2) return { distance: 0, vertical: 0, straight: 0, pass: false };
  const b = bbox(pts);
  const net = Math.abs(pts[pts.length - 1].x - pts[0].x);
  const vertical = net > 0 ? b.h / net : Infinity;
  const straight = b.w > 0 ? net / b.w : 0;
  const need = cfg.sweep.minDistance * spanFactor(pts);
  return {
    distance: net, vertical, straight,
    pass: net >= need && vertical <= cfg.sweep.maxVerticalRatio &&
      straight >= cfg.sweep.minStraightness,
  };
}

// Agitar (zigzag): cambios de sentido, en x o en y (se toma el eje con más). Un cambio solo
// cuenta si el vaivén previo tuvo al menos `minAmplitude` px (histéresis: el temblor del mouse
// no suma). Aceptar ambos ejes lo hace natural: "sacudir el cursor" en cualquier dirección.
function reversals(vals, amp) {
  let ext = vals.length ? vals[0] : 0, dir = 0, changes = 0;
  for (const v of vals) {
    if (dir === 0) {
      if (Math.abs(v - ext) >= amp) { dir = Math.sign(v - ext); ext = v; }
    } else if (dir > 0) {
      if (v > ext) ext = v;
      else if (ext - v >= amp) { dir = -1; ext = v; changes++; }
    } else {
      if (v < ext) ext = v;
      else if (v - ext >= amp) { dir = 1; ext = v; changes++; }
    }
  }
  return changes;
}
function measureZigzag(pts, cfg) {
  const amp = cfg.zigzag.minAmplitude;
  const cx = reversals(pts.map((p) => p.x), amp);
  const cy = reversals(pts.map((p) => p.y), amp);
  const changes = Math.max(cx, cy);
  const axis = cy > cx ? 'y' : 'x';   // eje dominante: lo usan la S (lado a lado) y la I (arriba y abajo)
  // Agitar es moverse "en el sitio": el recorrido total es mucho mayor que el desplazamiento
  // neto. Un barrido o un subir con vaivén avanzan hacia algún lado y no cuentan.
  let path = 0;
  for (let i = 1; i < pts.length; i++) path += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const net = pts.length > 1 ? Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y) : 0;
  const inPlace = net < 2 * amp || path / Math.max(1, net) >= cfg.zigzag.minPathRatio;
  return { changes, inPlace, axis, pass: changes >= cfg.zigzag.minSignChanges && inPlace };
}

export function createRecognizer(cfg = CONFIG.gestures) {
  let samples = [];          // {x, y, t}: ventana deslizante
  let cooldownUntil = -Infinity;
  let prevGrab = false;
  let grabStart = 0;
  let lastFired = null;
  let lastFiredAt = -Infinity;
  let lastMoveT = 0; // último instante con movimiento claro (para el progreso de "quieto")

  // Se guarda lo suficiente para la ventana más larga: así un gesto lento también se reconoce.
  const maxFrac = Math.max(1, ...cfg.windowFractions);
  const keepMs = Math.max(cfg.windowMs * maxFrac, cfg.still.durationMs) + 100;

  function measureStill(now) {
    const span = samples.length ? now - samples[0].t : 0;
    const recent = samples.filter((s) => s.t >= now - cfg.still.durationMs);
    if (recent.length < 2 || span < cfg.still.durationMs) {
      return { speed: Infinity, heldMs: 0, pass: false };
    }
    let path = 0;
    for (let i = 1; i < recent.length; i++) {
      path += Math.hypot(recent[i].x - recent[i - 1].x, recent[i].y - recent[i - 1].y);
    }
    const secs = (recent[recent.length - 1].t - recent[0].t) / 1000;
    const speed = secs > 0 ? path / secs : Infinity;
    return { speed, heldMs: secs * 1000, pass: speed <= cfg.still.speedThreshold };
  }

  function fire(name, now) {
    lastFired = name;
    lastFiredAt = now;
    cooldownUntil = now + cfg.cooldownMs;
    samples = []; // el gesto se "consume": el siguiente se mide desde cero
  }

  function push(input, now) {
    // Agarrar y soltar: evento, no trayectoria. Se evalúa antes y aunque haya cooldown
    // no lo ignoramos al soltar, pero sí respeta el cooldown para no pisar otro gesto.
    let grabHeldMs = 0;
    if (input.grab && !prevGrab) grabStart = now;
    const released = !input.grab && prevGrab;
    if (input.grab || released) grabHeldMs = now - grabStart; // al soltar, cuánto se mantuvo
    const grabPass = released && now - grabStart >= cfg.grab.minHoldMs;
    prevGrab = input.grab;

    if (!input.active) {
      samples = [];
      return { fired: null, report: emptyReport(now) };
    }
    // En enfriamiento no se acumula trayectoria: si no, la cola del mismo movimiento
    // que ya disparó un gesto volvería a pasar el umbral al terminar la pausa.
    if (now < cooldownUntil) {
      samples = [];
      return { fired: null, report: { ...emptyReport(now), cooling: true } };
    }
    samples.push({ x: input.x, y: input.y, t: now });
    // Movimiento: si la velocidad entre las dos últimas muestras supera el doble del umbral.
    if (samples.length < 2) lastMoveT = now;
    else {
      const a = samples[samples.length - 2];
      const dtS = (now - a.t) / 1000;
      const sp = dtS > 0 ? Math.hypot(input.x - a.x, input.y - a.y) / dtS : 0;
      if (sp > cfg.still.speedThreshold * 2) lastMoveT = now;
    }
    while (samples.length && samples[0].t < now - keepMs) samples.shift();

    const win = samples.filter((s) => s.t >= now - cfg.windowMs * maxFrac);
    // Cada trazo se mide en varias ventanas (de la más larga a la más corta); pasa si pasa en
    // alguna y conserva el trozo que lo cumplió (`trail`). El progreso es el mejor de todas.
    const slices = cfg.windowFractions.map((f) => win.filter((s) => s.t >= now - cfg.windowMs * f));
    const c1p = (v) => Math.min(1, Math.max(0, v));
    // Claves explícitas (NO `fn.name`: el minificador renombra las funciones y rompe la producción).
    const progOf = {
      circle: (m) => c1p(m.angle / cfg.circle.minAngleDeg) * c1p(m.aspect / 0.6) *
        (m.radius >= cfg.circle.minRadius ? c1p(1 - Math.max(0, m.radiusVar - cfg.circle.radiusTolerance)) : 0),
      rise: (m) => c1p(m.distance / cfg.rise.minDistance) * (m.lateral <= cfg.rise.maxLateralRatio * 1.5 ? 1 : 0.3),
      sweep: (m) => c1p(m.distance / cfg.sweep.minDistance) * (m.vertical <= cfg.sweep.maxVerticalRatio * 1.5 ? 1 : 0.3),
      zigzag: (m) => c1p(m.changes / cfg.zigzag.minSignChanges),
    };
    const pick = (key, fn) => {
      let first = null, best = 0, passing = null;
      for (const sl of slices) {
        const m = fn(sl, cfg);
        const pr = m.pass ? 1 : progOf[key](m);
        if (pr > best) best = pr;
        if (!first) first = { ...m, trail: sl };
        if (m.pass && !passing) passing = { ...m, trail: sl };
      }
      const out = passing || first;
      out.bestProgress = best;
      return out;
    };
    const report = {
      circle: pick('circle', measureCircle),
      rise: pick('rise', measureRise),
      sweep: pick('sweep', measureSweep),
      zigzag: pick('zigzag', measureZigzag),
      still: measureStill(now),
      grab: { heldMs: grabHeldMs, pass: grabPass },
      cooling: false,
      lastFired, lastFiredAt,
      trail: win,
    };
    // Progreso 0..1 de cada gesto: el mejor entre todas las ventanas. Sirve para que una letra
    // "escuche" mientras se hace el gesto, antes de completarse.
    const c1 = (v) => Math.min(1, Math.max(0, v));
    report.progress = {
      circle: report.circle.bestProgress,
      rise: report.rise.bestProgress,
      sweep: report.sweep.bestProgress,
      zigzag: report.zigzag.bestProgress,
      still: c1((now - lastMoveT) / cfg.still.durationMs),
      grab: 0, // el agarre ya tiene su propia retroalimentación (la semilla de la Y)
    };

    // Prioridad: acciones deliberadas primero; entre trazos, el más específico primero
    // (círculo antes que zigzag, porque un círculo también invierte la dirección en x).
    // Los trazos rectos (barrido, subir) van antes que agitar: exigen ir recto, así que un
    // barrido con vaivén no se confunde con una sacudida, y una sacudida no pasa por recta.
    const order = ['grab', 'still', 'circle', 'sweep', 'rise', 'zigzag'];
    // Si lo que se está dibujando es claramente un círculo (progreso alto), los trazos rectos y
    // agitar esperan: la primera mitad de un círculo se parece a un trazo recto.
    const drawingCircle = report.circle.bestProgress >= 0.55;
    for (const name of order) {
      if (drawingCircle && (name === 'sweep' || name === 'rise' || name === 'zigzag')) continue;
      if (report[name].pass) {
        fire(name, now);
        report.lastFired = name;
        report.lastFiredAt = now;
        report.firedTrail = report[name].trail || win; // el trozo que cumplió el gesto
        report.firedAxis = name === 'zigzag' ? report.zigzag.axis : null;
        return { fired: name, report };
      }
    }
    return { fired: null, report };
  }

  function emptyReport(now) {
    return {
      circle: { pass: false }, rise: { pass: false }, sweep: { pass: false },
      zigzag: { pass: false }, still: { pass: false }, grab: { pass: false },
      progress: { circle: 0, rise: 0, sweep: 0, zigzag: 0, still: 0, grab: 0 },
      cooling: false, lastFired, lastFiredAt, trail: [],
    };
  }

  return { push };
}
