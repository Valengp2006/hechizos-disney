// audio.js — el sonido del sistema, con Web Audio y sin dependencias.
//
// Dos capas independientes:
//   1. MÚSICA: un loop de archivo (audio.url), opcional y apagado por ahora (audio.music).
//   2. SONIDO MÁGICO (sfx): sintetizado en vivo, para que suene a celesta / caja de música con
//      eco sin necesitar archivos. Cada letra tiene una nota de la pentatónica de Re mayor, en el
//      orden de la palabra (D-I-S-N-E-Y = Re Mi Fa# La Si Re): al despertar las letras en ese
//      orden suena una escala ascendente. Todo es determinista (sin azar).
//
// Los navegadores bloquean el sonido hasta un gesto del usuario (clic, toque o tecla), así que
// arranca con el primer gesto. Para una exhibición sin clic: abrir Chrome con
// --autoplay-policy=no-user-gesture-required.
import { CONFIG } from './config.js';

let ctx = null;
let musicGain = null;
let master = null;     // salida de los efectos (con compresor)
let reverb = null;     // envío al eco
let padGain = null;    // colchón suave de fondo
let started = false;

// Pentatónica de Re mayor: Re4 Mi4 Fa#4 La4 Si4 Re5 Mi5 Fa#5 La5
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0];
const noteOf = (ch) => {
  const i = [...CONFIG.font.word].indexOf(ch);
  return SCALE[Math.max(0, i) % SCALE.length];
};

// ---------- cadena de efectos: compresor + eco brillante ----------
function buildChain() {
  const S = CONFIG.audio.sfx;
  master = ctx.createGain();
  master.gain.value = S.volume;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);

  // Eco con realimentación y filtro: da el "brillo" de sala sin cargar una reverberación.
  reverb = ctx.createGain();
  reverb.gain.value = S.echo;
  const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1);
  d1.delayTime.value = 0.23; d2.delayTime.value = 0.37;
  const fb = ctx.createGain(); fb.gain.value = 0.4;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
  reverb.connect(d1); reverb.connect(d2);
  d1.connect(lp); d2.connect(lp);
  lp.connect(fb); fb.connect(d1); fb.connect(d2);
  lp.connect(comp);
}

// Un tañido de celesta: fundamental más parciales inarmónicos suaves que decaen rápido.
function bell(freq, t0, dur = 1.6, gain = 0.5) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  [[1, 1], [2.0, 0.34], [3.01, 0.14], [4.2, 0.06], [5.43, 0.03]].forEach(([m, a], i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * m * (1 + 0.0012 * i);
    const og = ctx.createGain();
    og.gain.value = a;
    o.connect(og); og.connect(g);
    o.start(t0); o.stop(t0 + dur + 0.05);
  });
  g.connect(master);
  g.connect(reverb);
}

// Arpegio: una nota tras otra, cada una un poco más suave al final.
function arp(freqs, t0, step = 0.07, dur = 1.4, gain = 0.4) {
  freqs.forEach((f, i) => bell(f, t0 + i * step, dur, gain * (1 - 0.06 * i)));
}

// Colchón de fondo: tres notas suaves (Re, La, Fa#) con un filtro que respira muy despacio.
function buildPad() {
  const S = CONFIG.audio.sfx;
  padGain = ctx.createGain();
  padGain.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.6;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(lp.frequency); lfo.start();
  [146.83, 220.0, 369.99].forEach((f, i) => {
    [-5, 5].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = cents + i;
      const g = ctx.createGain(); g.gain.value = 0.3;
      o.connect(g); g.connect(lp);
      o.start();
    });
  });
  lp.connect(padGain);
  padGain.connect(master);
  padGain.connect(reverb);
  fadePad(S.pad, 5);
}
function fadePad(level, secs) {
  if (!padGain) return;
  const t = ctx.currentTime;
  padGain.gain.cancelScheduledValues(t);
  padGain.gain.setValueAtTime(padGain.gain.value, t);
  padGain.gain.linearRampToValueAtTime(level, t + secs);
}

// ---------- música de archivo (opcional) ----------
async function loadMusic() {
  const res = await fetch(import.meta.env.BASE_URL + CONFIG.audio.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ctx.decodeAudioData(await res.arrayBuffer());
}
function fadeMusic(value, ms) {
  if (!musicGain) return;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(value, t + ms / 1000);
}

async function start() {
  if (started) return;
  started = true;
  ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  buildChain();
  if (CONFIG.audio.sfx.enabled && CONFIG.audio.sfx.pad > 0) buildPad();
  // Primera señal: un destello suave para que se sepa que el sonido está encendido.
  if (CONFIG.audio.sfx.enabled) arp([SCALE[3], SCALE[5], SCALE[7]], ctx.currentTime + 0.05, 0.12, 2.2, 0.28);

  if (!CONFIG.audio.music) return; // música en loop apagada: solo la capa de sonidos mágicos
  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(ctx.destination);
  try {
    const buf = await loadMusic();
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.connect(musicGain); src.start();
    fadeMusic(CONFIG.audio.volume, CONFIG.audio.fadeInMs);
  } catch (err) {
    console.warn(`[audio] sin música de archivo (${CONFIG.audio.url}): ${err.message}`);
  }
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

// Silencio real antes de la revelación y regreso después (música y colchón).
export function silence() {
  fadeMusic(0, CONFIG.audio.fadeOutMs);
  fadePad(0, 0.8);
}
export function unsilence() {
  fadeMusic(CONFIG.audio.volume, CONFIG.audio.fadeInMs);
  fadePad(CONFIG.audio.sfx.pad, 3);
}

// ---------- sonidos del juego ----------
const ok = () => ctx && master && CONFIG.audio.sfx.enabled;
let lastSense = -1e9;
const fired = {}; // umbrales de progreso ya tañidos por juego

export const sfx = {
  // Una letra empieza a notar tu luz: un destello muy suave (con freno para no saturar).
  sense(ch) {
    if (!ok()) return;
    const now = ctx.currentTime;
    if (now - lastSense < 0.6) return;
    lastSense = now;
    bell(noteOf(ch) * 2, now, 0.9, 0.12);
  },
  // El gesto abrió el minijuego: dos notas que suben (la de la letra y su quinta).
  open(ch) {
    if (!ok()) return;
    const f = noteOf(ch), t = ctx.currentTime;
    bell(f, t, 1.4, 0.34);
    bell(f * 1.5, t + 0.12, 1.6, 0.3);
    fired[ch] = 0;
  },
  // Gesto equivocado: una nota baja y muy suave, sin castigo.
  wrong() {
    if (!ok()) return;
    bell(196, ctx.currentTime, 0.7, 0.14);
  },
  // Avance del minijuego: tañidos al pasar el 33 % y el 66 %, cada vez más agudos.
  progress(ch, p) {
    if (!ok() || !ch) return;
    const stage = p >= 0.66 ? 2 : p >= 0.33 ? 1 : 0;
    if ((fired[ch] || 0) >= stage) return;
    fired[ch] = stage;
    const i = [...CONFIG.font.word].indexOf(ch);
    bell(SCALE[(i + stage * 2) % SCALE.length] * 2, ctx.currentTime, 1.2, 0.2);
  },
  // La letra despierta: una escala ascendente tipo arpa que termina en su nota.
  conjure(ch) {
    if (!ok()) return;
    const i = [...CONFIG.font.word].indexOf(ch);
    const base = Math.max(0, i);
    const notes = [0, 1, 2, 3, 4].map((k) => SCALE[(base + k) % SCALE.length] * (base + k >= SCALE.length ? 2 : 1));
    arp([notes[0] * 0.5, ...notes], ctx.currentTime, 0.075, 2.0, 0.42);
    bell(noteOf(ch) * 2, ctx.currentTime + 0.5, 2.4, 0.28); // su nota, arriba y larga
  },
  // La alegría se contagia (saltito o avivamiento): un destello corto.
  cheer() {
    if (!ok()) return;
    arp([SCALE[4] * 2, SCALE[6] * 2], ctx.currentTime, 0.06, 0.7, 0.14);
  },
  // Inicio de cuento: cada línea que se escribe suena como una nota que sube; la última
  // cierra con un destello. `i` es el índice de la línea, `n` cuántas hay.
  story(i, n) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const f = SCALE[Math.min(SCALE.length - 1, i * 2)] ;
    bell(f, t, 2.6, 0.34);
    bell(f * 2, t + 0.05, 1.8, 0.14);
    if (i === n - 1) arp([SCALE[4], SCALE[5], SCALE[7]], t + 0.5, 0.14, 2.4, 0.22);
  },
  // Final: las letras convergen (barrido ascendente), se revela (acorde pleno) y reposa.
  converge() {
    if (!ok()) return;
    const t = ctx.currentTime;
    SCALE.forEach((f, i) => bell(f, t + i * 0.3, 2.4, 0.26));
  },
  reveal() {
    if (!ok()) return;
    const t = ctx.currentTime;
    [146.83, 220.0, 293.66, 369.99, 440.0, 587.33].forEach((f, i) => bell(f, t + i * 0.05, 4.5, 0.36));
    arp([SCALE[5], SCALE[6], SCALE[7], SCALE[8], SCALE[7], SCALE[6]], t + 0.9, 0.18, 2.6, 0.24);
  },
};
