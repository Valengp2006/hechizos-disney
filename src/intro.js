// intro.js — introducción narrativa, "inicio de cuento".
// Cada frase la traza un lápiz de luz de izquierda a derecha, con la propia tipografía
// (contorno y puntos, como las letras del juego), se queda un instante y se apaga.
// No da instrucciones: cuenta quién duerme en la oscuridad. Se puede saltar con un clic.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { textShape } from './font.js';
import { haloTexture, rgb } from './render.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

export function createIntro({ scene, font }) {
  const I = CONFIG.intro;
  const group = new THREE.Group();
  scene.add(group);
  const amber = rgb(CONFIG.visual.colors.amber);
  const gold = rgb(CONFIG.visual.colors.awake);

  let lines = [];       // {shape, segPos, segCol, ptsPos, ptsCol, objects, x, y, scale}
  let builtFor = '';
  let t0 = 0;
  let done = true;

  // Pluma de luz: un halo que sigue el frente de la escritura.
  const penGeo = new THREE.BufferGeometry();
  penGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const pen = new THREE.Points(penGeo, new THREE.PointsMaterial({
    map: haloTexture(), color: gold, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 34, sizeAttenuation: false,
  }));
  pen.frustumCulled = false;
  group.add(pen);

  function build(W, H) {
    group.children.filter((c) => c !== pen).forEach((c) => group.remove(c));
    const ref = Math.min(H, W * 0.75);
    lines = I.lines.map((text) => {
      const shape = textShape(font, text, 100, 3.2);
      // Escala: alto objetivo por sizeRatio, sin pasarse del ancho máximo.
      const scale = Math.min((I.sizeRatio * ref) / 70, (I.widthRatio * W) / shape.width);
      const x = (W - shape.width * scale) / 2;
      const y = I.y * H - (shape.height * scale) / 2;

      // Segmentos del contorno (el trazo fino) y puntos (la densidad de luz).
      const segs = [];
      for (const c of shape.contours) {
        const p = c.points;
        for (let i = 1; i < p.length; i++) segs.push(p[i - 1], p[i]);
        if (c.closed && p.length > 1) segs.push(p[p.length - 1], p[0]);
      }
      const segPos = new Float32Array(segs.length * 3);
      const segCol = new Float32Array(segs.length * 3);
      segs.forEach((p, i) => { segPos[i * 3] = x + p.x * scale; segPos[i * 3 + 1] = y + p.y * scale; });
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(segPos, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3));
      const lineObj = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      lineObj.frustumCulled = false;

      const ptsPos = new Float32Array(shape.points.length * 3);
      const ptsCol = new Float32Array(shape.points.length * 3);
      shape.points.forEach((p, i) => { ptsPos[i * 3] = x + p.x * scale; ptsPos[i * 3 + 1] = y + p.y * scale; });
      const ptsGeo = new THREE.BufferGeometry();
      ptsGeo.setAttribute('position', new THREE.BufferAttribute(ptsPos, 3));
      ptsGeo.setAttribute('color', new THREE.BufferAttribute(ptsCol, 3));
      const ptsObj = new THREE.Points(ptsGeo, new THREE.PointsMaterial({
        map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, size: 4, sizeAttenuation: false,
      }));
      ptsObj.frustumCulled = false;
      group.add(lineObj, ptsObj);
      return { shape, segs, segPos, segCol, lineGeo, ptsPos, ptsCol, ptsGeo, ptsLen: shape.points.length, x, y, scale, w: shape.width * scale };
    });
    builtFor = `${W}x${H}`;
  }

  const lineSpan = () => I.writeMs + I.holdMs + I.fadeMs + I.gapMs;
  const total = () => I.startDelayMs + I.lines.length * lineSpan();

  function restart(now) { t0 = now; done = false; }
  function skip() { done = true; group.visible = false; pen.material.opacity = 0; }

  function update(now) {
    if (done) { group.visible = false; return; }
    group.visible = true;
    const W = window.innerWidth, H = window.innerHeight;
    if (builtFor !== `${W}x${H}`) build(W, H);
    const t = now - t0;
    if (t > total()) { skip(); return; }

    let penOp = 0, penX = 0, penY = 0;
    lines.forEach((ln, i) => {
      const lt = t - I.startDelayMs - i * lineSpan();
      let p = 0, mult = 0;
      if (lt >= 0 && lt < I.writeMs + I.holdMs + I.fadeMs) {
        p = ease(lt / I.writeMs);
        mult = lt < I.writeMs + I.holdMs ? 1 : 1 - (lt - I.writeMs - I.holdMs) / I.fadeMs;
        if (lt < I.writeMs) { penOp = 1; }
      }
      // Frente de escritura: lo que está a la izquierda se enciende; el borde se suaviza.
      const front = p * (ln.w + 40);
      const feather = 60;
      const setCols = (pos, col, n, stride) => {
        for (let k = 0; k < n; k++) {
          const px = pos[k * 3] - ln.x;
          const b = mult > 0 ? clamp01((front - px) / feather) * mult : 0;
          const warm = clamp01(1 - (front - px) / 260); // recién escrito = dorado; luego ámbar
          col[k * 3] = (amber.r + (gold.r - amber.r) * warm) * b * stride;
          col[k * 3 + 1] = (amber.g + (gold.g - amber.g) * warm) * b * stride;
          col[k * 3 + 2] = (amber.b + (gold.b - amber.b) * warm) * b * stride;
        }
      };
      setCols(ln.segPos, ln.segCol, ln.segs.length, 0.85);
      setCols(ln.ptsPos, ln.ptsCol, ln.ptsLen, 0.7);
      ln.lineGeo.attributes.color.needsUpdate = true;
      ln.ptsGeo.attributes.color.needsUpdate = true;
      if (lt >= 0 && lt < I.writeMs) {
        penX = ln.x + p * (ln.w + 40);
        penY = ln.y + (ln.shape.height * ln.scale) * 0.5 + Math.sin(lt * 0.012) * 6;
      }
    });
    pen.material.opacity = penOp * 0.9;
    penGeo.attributes.position.setXYZ(0, penX, penY, 0);
    penGeo.attributes.position.needsUpdate = true;
  }

  return { update, restart, skip, active: () => !done };
}
