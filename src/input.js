// input.js — entrada unificada. El resto del sistema solo ve este objeto, no sabe
// si viene del mouse o (Hito 5) de la mano:
//   { x, y, vx, vy, grab, source: 'mouse' | 'hand', active }
// Posición en px de pantalla; velocidad en px/s.
export const input = { x: 0, y: 0, vx: 0, vy: 0, grab: false, source: 'mouse', active: false };

let target = { x: 0, y: 0 };
let prev = null;
// Suavizado de la velocidad: el mouse entrega pocos eventos y la velocidad es parte de la mecánica.
const VELOCITY_SMOOTHING = 0.25;

export function initInput(el = window) {
  el.addEventListener('pointermove', (e) => {
    target = { x: e.clientX, y: e.clientY };
    input.active = true;
  });
  el.addEventListener('pointerdown', () => { input.grab = true; });
  el.addEventListener('pointerup', () => { input.grab = false; });
  document.addEventListener('pointerleave', () => { input.active = false; input.grab = false; });
}

// Se llama una vez por frame con dt en segundos.
export function updateInput(dt) {
  input.x = target.x;
  input.y = target.y;
  if (prev && dt > 0) {
    const vx = (input.x - prev.x) / dt;
    const vy = (input.y - prev.y) / dt;
    input.vx += (vx - input.vx) * VELOCITY_SMOOTHING;
    input.vy += (vy - input.vy) * VELOCITY_SMOOTHING;
  }
  prev = { x: input.x, y: input.y };
}
