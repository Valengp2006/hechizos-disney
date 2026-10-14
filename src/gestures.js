// gestures.js — reconocimiento de gestos por trayectoria. Lógica pura y determinista:
// la misma secuencia de muestras da siempre el mismo resultado. No toca el DOM.
//
// Cada frame se llama push(input, nowMs). El reconocedor guarda las últimas muestras
// (la ventana de tiempo), mide cada gesto y devuelve:
//   { fired: 'circle'|'rise'|'sweep'|'zigzag'|'still'|'grab'|null, report }
// `report` trae las métricas de todos los gestos y si pasan o no (para el panel dev).
// Qué número cuenta como "gesto" vive en CONFIG.gestures.
import { CONFIG } from './config.js';

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
  if (pts.length < 8) return { angle: 0, radiusVar: 0, radius: 0, pass: false };
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
  return {
    angle, radiusVar, radius: mean,
    pass: angle >= cfg.circle.minAngleDeg && radiusVar <= cfg.circle.radiusTolerance &&
      mean >= cfg.circle.minRadius,
  };
}

// Subir: desplazamiento vertical hacia arriba dominante, poco vaivén y poco ancho.
function measureRise(pts, cfg) {
  if (pts.length < 2) return { distance: 0, lateral: 0, straight: 0, pass: false };
  const b = bbox(pts);
  const net = pts[0].y - pts[pts.length - 1].y; // + = hacia arriba (y crece hacia abajo)
  const lateral = net > 0 ? b.w / net : Infinity;
  const straight = b.h > 0 ? net / b.h : 0;
  return {
    distance: net, lateral, straight,
    pass: net >= cfg.rise.minDistance && lateral <= cfg.rise.maxLateralRatio &&
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
  return {
    distance: net, vertical, straight,
    pass: net >= cfg.sweep.minDistance && vertical <= cfg.sweep.maxVerticalRatio &&
      straight >= cfg.sweep.minStraightness,
  };
}

// Zigzag: cambios de sentido en x. Un cambio solo cuenta si el vaivén previo tuvo al
// menos `minAmplitude` px (histéresis: el temblor del mouse no suma).
function measureZigzag(pts, cfg) {
  const amp = cfg.zigzag.minAmplitude;
  let ext = pts.length ? pts[0].x : 0, dir = 0, changes = 0;
  for (const { x } of pts) {
    if (dir === 0) {
      if (Math.abs(x - ext) >= amp) { dir = Math.sign(x - ext); ext = x; }
    } else if (dir > 0) {
      if (x > ext) ext = x;
      else if (ext - x >= amp) { dir = -1; ext = x; changes++; }
    } else {
      if (x < ext) ext = x;
      else if (x - ext >= amp) { dir = 1; ext = x; changes++; }
    }
  }
  return { changes, pass: changes >= cfg.zigzag.minSignChanges };
}

export function createRecognizer(cfg = CONFIG.gestures) {
  let samples = [];          // {x, y, t}: ventana deslizante
  let cooldownUntil = -Infinity;
  let prevGrab = false;
  let grabStart = 0;
  let lastFired = null;
  let lastFiredAt = -Infinity;

  const keepMs = Math.max(cfg.windowMs, cfg.still.durationMs) + 100;

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
    if (input.grab) grabHeldMs = now - grabStart;
    const released = !input.grab && prevGrab;
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
    while (samples.length && samples[0].t < now - keepMs) samples.shift();

    const win = samples.filter((s) => s.t >= now - cfg.windowMs);
    // Cada trazo se mide sobre la ventana completa y sobre sufijos más recientes. Pasa si
    // pasa en alguno; el resultado conserva el trozo que lo cumplió (`trail`).
    const slices = cfg.windowFractions.map((f) => win.filter((s) => s.t >= now - cfg.windowMs * f));
    const pick = (fn) => {
      let first = null;
      for (const sl of slices) {
        const m = fn(sl, cfg);
        if (!first) first = { ...m, trail: sl };
        if (m.pass) return { ...m, trail: sl };
      }
      return first;
    };
    const report = {
      circle: pick(measureCircle),
      rise: pick(measureRise),
      sweep: pick(measureSweep),
      zigzag: pick(measureZigzag),
      still: measureStill(now),
      grab: { heldMs: grabHeldMs, pass: grabPass },
      cooling: false,
      lastFired, lastFiredAt,
      trail: win,
    };

    // Prioridad: acciones deliberadas primero; entre trazos, el más específico primero
    // (círculo antes que zigzag, porque un círculo también invierte la dirección en x).
    const order = ['grab', 'still', 'circle', 'zigzag', 'sweep', 'rise'];
    for (const name of order) {
      if (report[name].pass) {
        fire(name, now);
        report.lastFired = name;
        report.lastFiredAt = now;
        report.firedTrail = report[name].trail || win; // el trozo que cumplió el gesto
        return { fired: name, report };
      }
    }
    return { fired: null, report };
  }

  function emptyReport(now) {
    return {
      circle: { pass: false }, rise: { pass: false }, sweep: { pass: false },
      zigzag: { pass: false }, still: { pass: false }, grab: { pass: false },
      cooling: false, lastFired, lastFiredAt, trail: [],
    };
  }

  return { push };
}
