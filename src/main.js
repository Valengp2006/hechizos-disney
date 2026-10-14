// main.js — arranque, escena y ciclo de three.js.
// Cámara ortográfica con 1 unidad = 1 px: así los umbrales de gestos (en px)
// de config.js significan lo mismo en pantalla. El origen está arriba a la izquierda.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { loadFont, wordShapes } from './font.js';
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

// ---------- Modo depuración de tipografía (Hito 2) ----------
// Tecla D: muestra/oculta contornos y puntos muestreados de las seis letras.
const debugGroup = new THREE.Group();
scene.add(debugGroup);

const lineMat = new THREE.LineBasicMaterial({
  color: rgb(CONFIG.visual.colors.ice),
  transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending,
});
const pointMat = new THREE.PointsMaterial({
  color: rgb(CONFIG.visual.colors.awake),
  size: 3, sizeAttenuation: false, blending: THREE.AdditiveBlending,
});

let font = null;
function buildDebug() {
  debugGroup.clear();
  if (!font) return;
  // Se parte del tamaño por alto y se reduce si la palabra no cabe en el ancho (90%).
  let size = window.innerHeight * CONFIG.font.debugSizeRatio;
  let shapes = wordShapes(font, CONFIG.font.word, size);
  let gap = size * 0.08;
  const fit = (window.innerWidth * 0.9) /
    (shapes.reduce((s, sh) => s + sh.width, 0) + gap * (shapes.length - 1));
  if (fit < 1) {
    size *= fit;
    shapes = wordShapes(font, CONFIG.font.word, size);
    gap = size * 0.08;
  }
  const total = shapes.reduce((s, sh) => s + sh.width, 0) + gap * (shapes.length - 1);
  let x = (window.innerWidth - total) / 2;
  const y = (window.innerHeight - shapes[0].height) / 2;
  for (const sh of shapes) {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    for (const c of sh.contours) {
      const pts = c.points.map((p) => new THREE.Vector3(p.x, p.y, 0));
      if (c.closed) pts.push(pts[0].clone());
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    const pg = new THREE.BufferGeometry().setFromPoints(sh.points.map((p) => new THREE.Vector3(p.x, p.y, 0)));
    g.add(new THREE.Points(pg, pointMat));
    debugGroup.add(g);
    x += sh.width + gap;
  }
}

// El debug solo existe en modo dev; D lo muestra u oculta dentro de dev.
let dev = false;
let debugOn = true;
const gestureDebug = createGestureDebug();
scene.add(gestureDebug.object);
const syncDebug = () => {
  debugGroup.visible = dev && debugOn;
  gestureDebug.setVisible(dev && debugOn);
};
onModeChange((d) => { dev = d; syncDebug(); });
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'd') { debugOn = !debugOn; syncDebug(); }
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
function onGesture(name) {
  if (dev) console.log('[gesto]', name);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  // top=0, bottom=h: el eje y crece hacia abajo, como en el mouse.
  camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = h;
  camera.updateProjectionMatrix();
  dust.resize(w, h);
  buildDebug();
}
window.addEventListener('resize', resize);

loadFont().then((f) => { font = f; resize(); }).catch(console.error);
resize();

renderer.setAnimationLoop(() => {
  tickPanel();
  const dt = Math.min(clock.getDelta(), 0.1); // tope: una pestaña dormida no hace saltar nada
  updateInput(dt);
  dust.update(dt, clock.elapsedTime, input);
  light.update(input);
  const now = performance.now();
  const { fired, report } = recognizer.push(input, now);
  if (fired) onGesture(fired);
  if (dev && debugOn) gestureDebug.update(report, now);
  renderer.render(scene, camera);
});
