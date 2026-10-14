// audio.js — música de fondo con Web Audio.
// Los navegadores bloquean el sonido hasta un gesto del usuario, así que el loop
// arranca solo con el primer click, toque o tecla (no hay botón ni texto).
// Un único GainNode maestro: volumen y silencios son rampas sobre él.
import { CONFIG } from './config.js';

let ctx = null;
let gain = null;
let started = false;
let buffer = null;

async function load() {
  const res = await fetch(import.meta.env.BASE_URL + CONFIG.audio.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.arrayBuffer();
  return ctx.decodeAudioData(data);
}

async function start() {
  if (started) return;
  started = true;
  ctx = new AudioContext();
  gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  try {
    buffer = await load();
  } catch (err) {
    console.warn(`[audio] sin música (${CONFIG.audio.url}): ${err.message}`);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true; // loop sin corte: se reproduce desde el buffer decodificado
  src.connect(gain);
  src.start();
  fadeTo(CONFIG.audio.volume, CONFIG.audio.fadeInMs);
}

function fadeTo(value, ms) {
  if (!gain) return;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(value, t + ms / 1000);
}

// Se llama una vez al arrancar la app: espera el primer gesto.
export function initAudio() {
  const go = () => {
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
    start();
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
}

// Para el final: silencio real antes de la revelación y regreso después.
export const silence = () => fadeTo(0, CONFIG.audio.fadeOutMs);
export const unsilence = () => fadeTo(CONFIG.audio.volume, CONFIG.audio.fadeInMs);
