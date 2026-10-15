// main.js — arranque, escena y ciclo de three.js.
// Cámara ortográfica con 1 unidad = 1 px: así los umbrales de gestos (en px)
// de config.js significan lo mismo en pantalla. El origen está arriba a la izquierda.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { loadFont } from './font.js';
import { createLetters } from './letter.js';
import { onModeChange, tickPanel } from './mode.js';
import { initAudio } from './audio.js';
import { input, initInput, updateInput } from './input.js';
import { createDust } from './dust.js';
import { createLightPoint } from './render.js';
import { createRecognizer } from './gestures.js';
import { createGestureDebug } from './debug.js';
import { createFinale } from './finale.js';
import { createIntro } from './intro.js';
import { createHelp } from './help.js';
import { createTutorial } from './tutorial.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// setRGB con sRGB: los colores de config.js son los que se ven (sin esto three.js los aclara).
const rgb = ([r, g, b]) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
scene.background = rgb(CONFIG.visual.background);

const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1000, 1000);

// El debug solo existe en modo dev; D lo muestra u oculta dentro de dev.
let dev = false;
// La introducción es de performance; en dev se salta (salvo ?intro) para probar rápido.
const introWanted = () =>
  CONFIG.intro.enabled && (!dev || CONFIG.intro.enabledInDev || new URLSearchParams(location.search).has('intro'));
function startIntro(now) {
  if (introWanted()) { intro.restart(now); tutorialPending = CONFIG.tutorial.enabled; }
  else { intro.skip(); tutorialPending = false; }
}
// Un clic salta el cuento (por si alguien ya lo vio).
window.addEventListener('pointerdown', () => { intro?.skip(); tutorial?.skip(); tutorialPending = false; });
let letters = null;
let finale = null;
let intro = null;
let help = null;
let tutorial = null;
let tutorialPending = false;
let lastSuccessAt = performance.now(); // último acierto (para decidir cuándo ayudar)
let forceHelp = false;                  // dev: tecla H muestra la ayuda al instante // se crea al cargar la fuente; declarado antes de onModeChange, que llama a syncDebug al registrarse
let debugOn = true;
const gestureDebug = createGestureDebug();
scene.add(gestureDebug.object);
const syncDebug = () => {
  letters?.setDebug(dev && debugOn);
  gestureDebug.setVisible(dev && debugOn);
};
onModeChange((d) => { dev = d; syncDebug(); });
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'd') { debugOn = !debugOn; syncDebug(); }
  if (k === 'r' && dev) letters?.reset(); // dev: apaga todas las letras para volver a probar
  if (k === 't' && dev) tutorial?.start(performance.now()); // dev: ver el mini-tutorial
  if (k === 'h' && dev) forceHelp = !forceHelp;   // dev: ver el pictograma de ayuda
  if (k === 'w' && dev) finale?.forceAwakenAll(); // dev: despierta las seis y dispara el final
});

initAudio();
initInput();

// ---------- Luz y polvo (Hito 3) ----------
const dust = createDust();
const light = createLightPoint();
scene.add(dust.object, light.object);
// Reloj propio (THREE.Clock está en desuso): dt en segundos con tope, y tiempo acumulado.
const clock = {
  last: performance.now(),
  elapsedTime: 0,
  getDelta() {
    const now = performance.now();
    const d = (now - this.last) / 1000;
    this.last = now;
    this.elapsedTime += d;
    return d;
  },
};

// Luz-invitación: si nadie juega, una luz tenue pasea despacio por la oscuridad.
// Cuando alguien mueve el punto de atención, se apaga. Es la única pista de que se puede jugar.
const ghostInput = { x: 0, y: 0, active: true };
const ghost = createLightPoint({ dim: CONFIG.visual.attractOpacity });
scene.add(ghost.object);
let lastRealMove = performance.now();
const recognizer = createRecognizer();
// Aquí se conectarán las letras (Hito 6): cada gesto reconocido llega con su nombre.
function onGesture(name, trail, info) {
  if (intro?.active() || tutorial?.active()) return; // durante el cuento y el tutorial no se juega
  const r = letters?.handleGesture(name, trail, input, info);
  if (r?.result === 'conjure') lastSuccessAt = performance.now();
  if (dev) console.log('[gesto]', name, r ? `-> ${r.letter}: ${r.result} (fin ${Math.round(r.x)},${Math.round(r.y)}; ${r.n} pts; dist ${r.dists})` : '-> ninguna letra');
}

let lastPx = -1, lastPy = -1;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  // top=0, bottom=h: el eje y crece hacia abajo, como en el mouse.
  camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = h;
  camera.updateProjectionMatrix();
  dust.resize(w, h);
  letters?.layout(w, h);
}
window.addEventListener('resize', resize);

loadFont().then((font) => {
  letters = createLetters(font);
  scene.add(letters.object);
  finale = createFinale({
    scene, letters,
    onReset: (now) => { lastSuccessAt = now; startIntro(now); },
  });
  intro = createIntro({ scene, font });
  help = createHelp({ scene });
  tutorial = createTutorial({ letters });
  startIntro(performance.now());
  resize();
  syncDebug();
}).catch(console.error);
resize();

renderer.setAnimationLoop(() => {
  const frameStart = performance.now();
  const dt = Math.min(clock.getDelta(), 0.1); // tope: una pestaña dormida no hace saltar nada
  updateInput(dt);
  finale?.update(dt * 1000, performance.now(), input);
  dust.setLift(Math.max(letters?.lift() ?? 0, finale?.lift() ?? 0));
  dust.setWarmth(Math.max(letters?.warmth() ?? 0, finale?.warmth() ?? 0));
  dust.update(dt, clock.elapsedTime, input);
  light.update(input);
  // Invitación: pasea en una curva fija (Lissajous) y solo si nadie ha jugado hace un rato.
  if (Math.hypot(input.x - lastPx, input.y - lastPy) > 2 || input.grab) lastRealMove = performance.now();
  lastPx = input.x; lastPy = input.y;
  const idleMs = performance.now() - lastRealMove;
  const invite = finale?.phase() === 'play' && !intro?.active() && !tutorial?.active() && idleMs > CONFIG.visual.attractAfterMs;
  const t = clock.elapsedTime;
  ghostInput.x = window.innerWidth * (0.5 + 0.3 * Math.sin(t * 0.31));
  ghostInput.y = window.innerHeight * (0.5 + 0.25 * Math.sin(t * 0.47 + 1));
  ghostInput.active = invite;
  ghost.update(ghostInput);
  const now = performance.now();
  const { fired, report } = recognizer.push(input, now);
  if (fired) onGesture(fired, report.firedTrail, { heldMs: report.grab.heldMs });
  letters?.update(dt * 1000, clock.elapsedTime, input, report.progress);
  if (dev && debugOn) gestureDebug.update(report, now, letters?.states());
  intro?.update(now);
  // Ayuda por luz: si lleva mucho sin acertar y hay una letra cerca, dibuja su gesto.
  // Tras el cuento arranca el mini-tutorial; mientras corre, la ayuda muestra la letra en turno.
  if (tutorialPending && !intro?.active()) { tutorial.start(now); tutorialPending = false; lastSuccessAt = now; }
  const tutLetter = tutorial?.update(now);
  const stuck = finale?.phase() === 'play' && !intro?.active() && !tutLetter && input.active &&
    now - lastSuccessAt > CONFIG.help.afterMs;
  const cur = letters?.current();
  if (tutLetter) help?.update(now, dt * 1000, tutLetter, true);
  else help?.update(now, dt * 1000, cur && cur.gesture ? cur : null, stuck || forceHelp);
  renderer.render(scene, camera);
  tickPanel(performance.now() - frameStart); // incluye la lógica y el envío de dibujo
});
