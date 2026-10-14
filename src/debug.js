// debug.js — panel de gestos (solo dev, tecla D). Muestra la trayectoria de la ventana
// y, por gesto, sus métricas contra el umbral de config.js: sirve para ajustar
// tolerancias y para la bitácora (hipótesis -> observación).
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { rgb } from './render.js';

const GESTURES = ['circle', 'rise', 'sweep', 'zigzag', 'still', 'grab'];

export function createGestureDebug() {
  const max = 256;
  const positions = new Float32Array(max * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setDrawRange(0, 0);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: rgb(CONFIG.visual.colors.awake), transparent: true, opacity: 0.9 }),
  );
  line.frustumCulled = false;

  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;left:8px;top:40px;margin:0;padding:6px 8px;font:11px/1.45 ui-monospace,monospace;' +
    'color:#b9aaff;background:rgba(4,3,10,.6);border:1px solid #3a2f66;pointer-events:none;display:none';
  document.body.appendChild(el);

  const g = CONFIG.gestures;
  const f = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '∞');
  const mark = (ok) => (ok ? '✔' : '·');

  function update(report, now, letterStates = '') {
    const trail = report.trail.slice(-max);
    for (let i = 0; i < trail.length; i++) {
      positions[i * 3] = trail[i].x;
      positions[i * 3 + 1] = trail[i].y;
      positions[i * 3 + 2] = 1;
    }
    geo.setDrawRange(0, trail.length);
    geo.attributes.position.needsUpdate = true;

    const c = report.circle, r = report.rise, s = report.sweep, z = report.zigzag, st = report.still, gr = report.grab;
    const lines = [
      `${mark(c.pass)} circle  ${f(c.angle)}°/${g.circle.minAngleDeg}  radVar ${f(c.radiusVar, 2)}/${g.circle.radiusTolerance}  r ${f(c.radius)}/${g.circle.minRadius}`,
      `${mark(r.pass)} rise    ${f(r.distance)}/${g.rise.minDistance}px  lat ${f(r.lateral, 2)}/${g.rise.maxLateralRatio}  rect ${f(r.straight, 2)}/${g.rise.minStraightness}`,
      `${mark(s.pass)} sweep   ${f(s.distance)}/${g.sweep.minDistance}px  vert ${f(s.vertical, 2)}/${g.sweep.maxVerticalRatio}  rect ${f(s.straight, 2)}/${g.sweep.minStraightness}`,
      `${mark(z.pass)} zigzag  ${f(z.changes)}/${g.zigzag.minSignChanges} cambios (amp ≥ ${g.zigzag.minAmplitude}px)`,
      `${mark(st.pass)} still   ${f(st.speed)}/${g.still.speedThreshold}px/s  ${f(st.heldMs)}/${g.still.durationMs}ms`,
      `${mark(gr.pass)} grab    sostenido ${f(gr.heldMs)}/${g.grab.minHoldMs}ms`,
      '',
      letterStates,
      report.lastFired
        ? `último: ${report.lastFired.toUpperCase()} hace ${f((now - report.lastFiredAt) / 1000, 1)}s${report.cooling ? '  (enfriando)' : ''}`
        : 'último: —',
    ];
    el.textContent = lines.join('\n');
  }

  function setVisible(v) {
    line.visible = v;
    el.style.display = v ? 'block' : 'none';
  }

  return { object: line, update, setVisible, gestures: GESTURES };
}
