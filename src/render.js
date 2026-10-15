// render.js — piezas de luz compartidas: sprite de halo y el punto de luz con estela.
import * as THREE from 'three';
import { CONFIG } from './config.js';

// Los colores de config.js son sRGB; sin esto three.js los aclara.
export const rgb = ([r, g, b]) =>
  new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);

// Halo suave (gradiente radial) reutilizado por todas las partículas de luz.
let haloTex = null;
export function haloTexture() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  haloTex = new THREE.CanvasTexture(c);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

// Punto de luz del jugador: cabeza brillante + estela que se apaga hacia atrás.
export function createLightPoint({ dim = 1 } = {}) {
  const n = CONFIG.visual.trailLength;
  const history = Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  const color = rgb(CONFIG.visual.colors.rose);

  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // La estela son halos pequeños que decaen en brillo; una línea los une para que
  // el trazo sea continuo aunque la mano se mueva rápido.
  const mat = new THREE.PointsMaterial({
    map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, size: CONFIG.visual.pointSize * 0.5, sizeAttenuation: false,
  });
  const trail = new THREE.Points(geo, mat);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );

  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const head = new THREE.Points(
    headGeo,
    new THREE.PointsMaterial({
      map: haloTexture(), color, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size: CONFIG.visual.pointSize * CONFIG.visual.glow,
      sizeAttenuation: false,
    }),
  );

  // `dim` (0..1) atenúa toda la luz: la usa la luz-invitación, que debe ser discreta.
  [mat, line.material, head.material].forEach((m) => { m.opacity = dim; });
  const group = new THREE.Group();
  group.add(trail, line, head);
  group.visible = false;

  let wasActive = false;
  function update(input) {
    group.visible = input.active;
    if (!input.active) { wasActive = false; return; }
    // Al aparecer, la estela parte de donde está la luz (no de la esquina de la pantalla).
    if (!wasActive) { history.forEach((h) => { h.x = input.x; h.y = input.y; }); wasActive = true; }
    // Cada frame: se descarta la muestra más vieja y entra la posición actual.
    history.shift();
    history.push({ x: input.x, y: input.y });
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1); // 0 = cola, 1 = cabeza
      positions[i * 3] = history[i].x;
      positions[i * 3 + 1] = history[i].y;
      const b = k * k; // decaimiento cuadrático: cola que se desvanece rápido
      colors[i * 3] = color.r * b;
      colors[i * 3 + 1] = color.g * b;
      colors[i * 3 + 2] = color.b * b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    headGeo.attributes.position.setXYZ(0, input.x, input.y, 0);
    headGeo.attributes.position.needsUpdate = true;
  }

  return { object: group, update };
}
