// mode.js — modo performance / dev.
//   performance: lo que ve el público (sin debug, sin cursor, sin paneles).
//   dev: contornos, puntos, trayectoria, FPS y reinicio por inactividad opcional.
// Una sola fuente de verdad: el resto del sistema pregunta `isDev()` o se suscribe.
import { CONFIG } from './config.js';

let dev = CONFIG.mode.initial === 'dev' || new URLSearchParams(location.search).has('dev');
const listeners = new Set();

export const isDev = () => dev;

// Regla: en performance el reinicio por inactividad siempre aplica.
export const idleResetEnabled = () => !dev || CONFIG.mode.idleResetInDev;

export function onModeChange(fn) {
  listeners.add(fn);
  fn(dev);
}

export function toggleMode() {
  dev = !dev;
  apply();
}

function apply() {
  // Sin cursor en performance: la única luz en pantalla es el punto de atención.
  document.body.style.cursor = dev ? 'default' : 'none';
  listeners.forEach((fn) => fn(dev));
}

// Panel de dev: FPS y modo. Se crea una vez y solo se ve en dev.
const panel = document.createElement('div');
panel.style.cssText =
  'position:fixed;left:8px;top:8px;padding:6px 8px;font:11px/1.4 ui-monospace,monospace;' +
  'color:#b9aaff;background:rgba(4,3,10,.6);border:1px solid #3a2f66;pointer-events:none;display:none';
document.body.appendChild(panel);

let frames = 0, last = performance.now(), fps = 0;
export function tickPanel() {
  frames++;
  const now = performance.now();
  if (now - last >= 500) {
    fps = Math.round((frames * 1000) / (now - last));
    frames = 0; last = now;
  }
  if (dev) panel.textContent = `DEV · ${fps} fps · D debug · M modo · F pantalla completa`;
}
onModeChange((d) => { panel.style.display = d ? 'block' : 'none'; });

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'm') toggleMode();
  if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }
});

apply();
