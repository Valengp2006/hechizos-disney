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
let letters = null; // se crea al cargar la fuente; declarado antes de onModeChange, que llama a syncDebug al registrarse
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
});

initAudio();
initInput();

// ---------- Luz y polvo (Hito 3) ----------
const dust = createDust();
const light = createLightPoint();
scene.add(dust.object, light.object);
const clock = new THREE.Clock();
const recognizer = createRecognizer();
// Aquí se conectarán las letras (Hito 6): cada gesto reconocido llega con su nombre.
function onGesture(name, trail) {
  const r = letters?.handleGesture(name, trail, input);
  if (dev) console.log('[gesto]', name, r ? `-> ${r.letter}: ${r.result}` : '-> ninguna letra');
}

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
  resize();
  syncDebug();
}).catch(console.error);
resize();

renderer.setAnimationLoop(() => {
  tickPanel();
  const dt = Math.min(clock.getDelta(), 0.1); // tope: una pestaña dormida no hace saltar nada
  updateInput(dt);
  dust.update(dt, clock.elapsedTime, input);
  light.update(input);
  const now = performance.now();
  const { fired, report } = recognizer.push(input, now);
  if (fired) onGesture(fired, report.trail);
  letters?.update(dt * 1000, clock.elapsedTime, input);
  if (dev && debugOn) gestureDebug.update(report, now, letters?.states());
  renderer.render(scene, camera);
});
