// backdrop.js — el fondo: un cielo de crepúsculo pintado en vez de negro liso.
//   · degradado índigo -> violeta -> ciruela con un resplandor cálido en el horizonte
//   · niebla (ruido fractal) que se desplaza muy despacio
//   · estrellas que titilan y unas pocas luces desenfocadas (bokeh) que flotan
// Todo es atmósfera: no lleva significado, así que no rompe la regla de que lo que significa sale
// de las letras. Es determinista (las posiciones salen de funciones fijas).
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { haloTexture, rgb } from './render.js';

const frac = (v) => v - Math.floor(v);
const hash = (a, b = 0) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);

const VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uMist;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(11.7, 3.1); a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = vUv;
    float asp = uRes.x / uRes.y;
    float y = uv.y;                               // 0 abajo, 1 arriba
    vec3 top = vec3(0.030, 0.035, 0.115);
    vec3 mid = vec3(0.095, 0.058, 0.190);
    vec3 low = vec3(0.205, 0.092, 0.205);
    vec3 col = mix(low, mid, smoothstep(0.0, 0.55, y));
    col = mix(col, top, smoothstep(0.45, 1.0, y));

    // Resplandor cálido del horizonte, un poco a un lado para que no sea simétrico.
    float gx = (uv.x - 0.42) * 1.25;
    float glow = exp(-gx * gx * 3.0) * exp(-pow(y * 2.4, 2.0));
    col += vec3(0.42, 0.20, 0.08) * glow * 0.55;

    // Niebla en dos capas que se desplazan a distinta velocidad.
    vec2 p1 = vec2(uv.x * asp, uv.y) * 2.1 + vec2(uTime * 0.010, uTime * 0.003);
    vec2 p2 = vec2(uv.x * asp, uv.y) * 3.6 - vec2(uTime * 0.016, -uTime * 0.005) + 7.3;
    float m = smoothstep(0.38, 0.88, fbm(p1)) * 0.7 + smoothstep(0.42, 0.9, fbm(p2)) * 0.45;
    vec3 mistCol = mix(vec3(0.17, 0.11, 0.33), vec3(0.50, 0.28, 0.42), 1.0 - y);
    col += mistCol * m * uMist * (0.30 + 0.70 * (1.0 - y));

    // Viñeta suave para llevar la mirada al centro.
    float v = smoothstep(1.2, 0.30, length((uv - 0.5) * vec2(asp * 0.85, 1.0)));
    col *= 0.52 + 0.48 * v;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createBackdrop(scene) {
  const B = CONFIG.backdrop;
  const group = new THREE.Group();
  scene.add(group);
  if (!B.enabled) return { update() {}, resize() {} };

  // Cielo y niebla: un cuadro a pantalla completa con shader.
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMist: { value: B.mist } },
    vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  group.add(sky);

  // Estrellas: puntos que titilan con fase propia.
  const N = B.stars;
  const sPos = new Float32Array(N * 3), sCol = new Float32Array(N * 3);
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({
    map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, size: 7, sizeAttenuation: false,
  }));
  stars.frustumCulled = false; stars.renderOrder = -900;
  group.add(stars);
  const cool = rgb([190, 205, 255]), warm = rgb([255, 226, 170]);
  const tmp = new THREE.Color();
  const sx = new Float32Array(N), sy = new Float32Array(N), sph = new Float32Array(N), sfr = new Float32Array(N), stone = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    sx[i] = hash(i, 1); sy[i] = 0.2 + 0.8 * hash(i, 2);   // más arriba que abajo
    sph[i] = hash(i, 3) * 6.28; sfr[i] = 0.6 + 1.6 * hash(i, 4); stone[i] = hash(i, 5) > 0.75 ? 1 : 0;
  }

  // Bokeh: luces grandes y suaves que flotan, en tres tamaños.
  const bokeh = [70, 120, 190].map((size, k) => {
    const n = 3;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const obj = new THREE.Points(geo, new THREE.PointsMaterial({
      map: haloTexture(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, size, sizeAttenuation: false,
    }));
    obj.frustumCulled = false; obj.renderOrder = -800;
    group.add(obj);
    return { n, pos, col, geo, k };
  });

  let W = window.innerWidth, H = window.innerHeight;
  function resize(w, h) { W = w; H = h; mat.uniforms.uRes.value.set(w, h); }
  resize(W, H);

  function update(t) {
    mat.uniforms.uTime.value = t;
    for (let i = 0; i < N; i++) {
      sPos[i * 3] = sx[i] * W; sPos[i * 3 + 1] = (1 - sy[i]) * H * 0.95;
      const tw = 0.45 + 0.55 * Math.sin(t * sfr[i] + sph[i]);
      tmp.copy(stone[i] ? warm : cool).multiplyScalar(B.starBrightness * (0.25 + 0.75 * tw * tw));
      sCol[i * 3] = tmp.r; sCol[i * 3 + 1] = tmp.g; sCol[i * 3 + 2] = tmp.b;
    }
    sGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.color.needsUpdate = true;
    bokeh.forEach((b) => {
      for (let i = 0; i < b.n; i++) {
        const sp = 0.004 + 0.003 * b.k;                   // los grandes van más lento
        const x = frac(hash(i + b.k * 7, 11) + t * sp) * (W + 300) - 150;
        const y = (0.15 + 0.7 * hash(i + b.k * 7, 12)) * H + Math.sin(t * 0.15 + i + b.k) * 14;
        b.pos[i * 3] = x; b.pos[i * 3 + 1] = y;
        const c = (i + b.k) % 2 ? cool : warm;
        const a = B.bokeh * (0.7 + 0.3 * Math.sin(t * 0.3 + i * 2 + b.k));
        b.col[i * 3] = c.r * a; b.col[i * 3 + 1] = c.g * a; b.col[i * 3 + 2] = c.b * a;
      }
      b.geo.attributes.position.needsUpdate = true;
      b.geo.attributes.color.needsUpdate = true;
    });
  }

  return { update, resize };
}
