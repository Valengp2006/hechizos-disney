// letter.js — una letra y su ciclo de estados, más el conjunto de las seis.
//
//   latente   invisible; solo polvo tenue en su zona
//   sensible  el punto de atención está cerca: el polvo se estremece
//   escuchando gesto equivocado: la letra se entreabre un instante y se apaga
//   conjurada el gesto correcto: el hechizo se ejecuta (aquí, un destello placeholder)
//   despierta terminado el hechizo: queda dorada, respirando
//
// Regla de reparto: un gesto lo recibe la letra más cercana (en latente/sensible) cuya
// caja esté a menos de `sensitiveRadius` del trazo. Si el gesto es el suyo, conjura;
// si es otro, escucha. Todo determinista: no hay azar en qué pasa.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { letterShape } from './font.js';
import { haloTexture, rgb } from './render.js';
import { rng } from './dust.js';
import { createPortal } from './spells/d.js';

// Hechizos por letra. Las letras sin entrada usan el destello placeholder.
const SPELLS = { D: createPortal };

export const STATE = {
  LATENT: 'latent', SENSITIVE: 'sensitive', LISTENING: 'listening',
  CONJURED: 'conjured', AWAKE: 'awake',
};

const REF_SIZE = 200; // tamaño de em con el que se construye la geometría; luego se escala

class Letter {
  constructor(char, font, index) {
    this.char = char;
    this.gesture = CONFIG.letters.gestures[char];
    this.state = STATE.LATENT;
    this.stateT = 0; // ms en el estado actual
    this.shape = letterShape(font, char, REF_SIZE);
    this.scale = 1;
    this.pos = { x: 0, y: 0 }; // esquina superior izquierda en pantalla (px)

    const colors = CONFIG.visual.colors;
    this.cMagic = rgb(colors.magic);
    this.cIce = rgb(colors.ice);
    this.cAwake = rgb(colors.awake);

    this.group = new THREE.Group();

    // Contorno (línea fina) y puntos muestreados: la letra "ya construida".
    this.lineMat = new THREE.LineBasicMaterial({
      color: this.cMagic, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const c of this.shape.contours) {
      const pts = c.points.map((p) => new THREE.Vector3(p.x, p.y, 0));
      if (c.closed) pts.push(pts[0].clone());
      this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.lineMat));
    }
    this.pointMat = new THREE.PointsMaterial({
      map: haloTexture(), color: this.cMagic, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 7, sizeAttenuation: false,
    });
    this.group.add(new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(this.shape.points.map((p) => new THREE.Vector3(p.x, p.y, 0))),
      this.pointMat,
    ));

    // Polvo de la zona: nace en la caja de la letra (semilla por letra: decorativo).
    const n = CONFIG.letters.latentDustCount;
    const rand = rng(1000 + index * 97);
    this.dustBase = new Float32Array(n * 2);
    this.dustPhase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.dustBase[i * 2] = (rand() * 1.3 - 0.15) * this.shape.width;
      this.dustBase[i * 2 + 1] = (rand() * 1.3 - 0.15) * this.shape.height;
      this.dustPhase[i] = rand() * Math.PI * 2;
    }
    this.dustPos = new Float32Array(n * 3);
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPos, 3));
    this.dustMat = new THREE.PointsMaterial({
      map: haloTexture(), color: this.cIce, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 9, sizeAttenuation: false,
    });
    const dust = new THREE.Points(this.dustGeo, this.dustMat);
    dust.frustumCulled = false;
    this.group.add(dust);

    // Destello del hechizo: un halo grande en el centro de la letra.
    this.flashGeo = new THREE.BufferGeometry();
    this.flashGeo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([this.shape.width / 2, this.shape.height / 2, 0]), 3));
    this.flashMat = new THREE.PointsMaterial({
      map: haloTexture(), color: this.cAwake, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 10, sizeAttenuation: false,
    });
    this.group.add(new THREE.Points(this.flashGeo, this.flashMat));

    // Contorno tenue de depuración (solo dev): dónde está la letra aunque esté latente.
    this.debugMat = new THREE.LineBasicMaterial({
      color: this.cIce, transparent: true, opacity: 0.22, depthWrite: false,
    });
    this.debug = new THREE.Group();
    for (const c of this.shape.contours) {
      const pts = c.points.map((p) => new THREE.Vector3(p.x, p.y, 0));
      if (c.closed) pts.push(pts[0].clone());
      this.debug.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.debugMat));
    }
    this.debug.visible = false;
    this.group.add(this.debug);

    // Hechizo propio de la letra (si existe). Se crea una vez; solo se anima.
    this.spell = SPELLS[char] ? SPELLS[char](this) : null;
    if (this.spell?.anchor) {
      // El destello nace donde el hechizo lo pide (p. ej. el punto de fuga del portal).
      this.flashGeo.attributes.position.setXYZ(0, this.spell.anchor.x, this.spell.anchor.y, 0);
    }
  }

  // Coloca la letra: centro en px y tamaño de em en px.
  place(cx, cy, sizePx) {
    this.scale = sizePx / REF_SIZE;
    const w = this.shape.width * this.scale, h = this.shape.height * this.scale;
    this.pos.x = cx - w / 2;
    this.pos.y = cy - h / 2;
    this.group.position.set(this.pos.x, this.pos.y, 0);
    this.group.scale.setScalar(this.scale);
    this.flashMat.size = sizePx * 1.4;
  }

  // Distancia (px) de un punto a la caja de la letra; 0 si está dentro.
  distanceTo(x, y) {
    const w = this.shape.width * this.scale, h = this.shape.height * this.scale;
    const dx = Math.max(this.pos.x - x, 0, x - (this.pos.x + w));
    const dy = Math.max(this.pos.y - y, 0, y - (this.pos.y + h));
    return Math.hypot(dx, dy);
  }

  set(state) { this.state = state; this.stateT = 0; }

  // --- transiciones (nombres del modelo) ---
  listen() { this.set(STATE.LISTENING); }
  conjure() { this.set(STATE.CONJURED); }
  awaken() { this.set(STATE.AWAKE); }
  reset() { this.set(STATE.LATENT); this.spell?.reset(); }

  // `near`: el punto de atención está cerca (solo importa en latente/sensible).
  update(dtMs, timeS, near) {
    const L = CONFIG.letters;
    this.stateT += dtMs;

    if (this.state === STATE.LATENT || this.state === STATE.SENSITIVE) {
      this.state = near ? STATE.SENSITIVE : STATE.LATENT;
    }

    let lineOp = 0, pointOp = 0, dustOp = L.latentDustOpacity, tremble = 0, flashOp = 0;
    let color = this.cMagic;

    switch (this.state) {
      case STATE.SENSITIVE:
        dustOp += L.sensitiveGain * 0.3;
        tremble = L.trembleAmplitude;
        break;
      case STATE.LISTENING: {
        // Se entreabre y se apaga: un pulso suave de ida y vuelta.
        const k = Math.min(this.stateT / L.listeningMs, 1);
        const pulse = Math.sin(Math.PI * k);
        lineOp = L.listeningOpacity * pulse;
        pointOp = L.listeningOpacity * 0.6 * pulse;
        tremble = L.trembleAmplitude * 0.5;
        if (k >= 1) this.reset();
        break;
      }
      case STATE.CONJURED: {
        dustOp = 0;
        if (this.spell) {
          // Hechizo real: él decide cómo se ve la letra y su destello.
          const k = Math.min(this.stateT / CONFIG.spells.durationMs[this.char], 1);
          const o = this.spell.conjured(k, this.stateT);
          color = o.color;
          lineOp = o.lineOp;
          pointOp = o.pointOp;
          flashOp = o.flashOp;
          this.flashMat.size = this.flashBase * o.flashScale;
          if (k >= 1) this.awaken();
          break;
        }
        // Placeholder: destello que se expande y deja la letra encendida.
        const k = Math.min(this.stateT / L.placeholderSpellMs, 1);
        color = this.cAwake;
        lineOp = Math.min(1, k * 3);
        pointOp = lineOp * 0.8;
        flashOp = (1 - k) * (1 - k);
        this.flashMat.size = this.flashBase * (0.4 + 1.4 * k);
        if (k >= 1) this.awaken();
        break;
      }
      case STATE.AWAKE: {
        const breath = 0.5 + 0.5 * Math.sin((this.stateT / L.breathMs) * Math.PI * 2);
        color = this.cAwake;
        lineOp = L.awakeOpacityMin + (L.awakeOpacityMax - L.awakeOpacityMin) * breath;
        pointOp = lineOp * 0.7;
        dustOp = 0;
        this.spell?.awake(this.stateT, breath);
        break;
      }
      default: break;
    }

    this.lineMat.color.copy(color);
    this.pointMat.color.copy(color);
    this.lineMat.opacity = lineOp;
    this.pointMat.opacity = pointOp;
    this.flashMat.opacity = flashOp;
    this.dustMat.opacity = Math.min(1, dustOp);

    // Polvo: se estremece (oscila con fase propia) cuando la letra está sensible.
    const amp = tremble / this.scale;
    const n = this.dustPhase.length;
    for (let i = 0; i < n; i++) {
      const ph = this.dustPhase[i];
      const f = tremble > 0 ? 38 : 0.7; // sensible: vibra rápido; latente: respira lento
      const a = tremble > 0 ? amp : 3 / this.scale;
      this.dustPos[i * 3] = this.dustBase[i * 2] + Math.sin(timeS * f + ph) * a;
      this.dustPos[i * 3 + 1] = this.dustBase[i * 2 + 1] + Math.cos(timeS * f * 1.3 + ph) * a;
    }
    this.dustGeo.attributes.position.needsUpdate = true;
  }
}

export function createLetters(font) {
  const letters = [...CONFIG.font.word].map((ch, i) => new Letter(ch, font, i));
  const group = new THREE.Group();
  letters.forEach((l) => group.add(l.group));
  let screen = { w: window.innerWidth, h: window.innerHeight };

  function layout(w, h) {
    screen = { w, h };
    for (const l of letters) {
      const p = CONFIG.letters.layout[l.char];
      l.place(p.x * w, p.y * h, p.size * h);
      l.flashBase = l.flashMat.size;
    }
  }

  // Letra más cercana (latente/sensible) dentro del radio; null si ninguna.
  function nearest(x, y) {
    let best = null, bestD = CONFIG.letters.sensitiveRadius;
    for (const l of letters) {
      if (l.state !== STATE.LATENT && l.state !== STATE.SENSITIVE) continue;
      const d = l.distanceTo(x, y);
      if (d <= bestD) { best = l; bestD = d; }
    }
    return best;
  }

  let target = null;
  function update(dtMs, timeS, input) {
    target = input.active ? nearest(input.x, input.y) : null;
    for (const l of letters) l.update(dtMs, timeS, l === target);
  }

  // Un gesto reconocido llega con su trazo; lo recibe la letra más cercana al trazo.
  function handleGesture(name, trail, input) {
    let x = input.x, y = input.y;
    if (trail && trail.length) {
      x = trail.reduce((s, p) => s + p.x, 0) / trail.length;
      y = trail.reduce((s, p) => s + p.y, 0) / trail.length;
    }
    const l = nearest(x, y) || target;
    if (!l) return null;
    if (l.gesture === name) { l.conjure(); return { letter: l.char, result: 'conjure' }; }
    l.listen();
    return { letter: l.char, result: 'listen' };
  }

  const allAwake = () => letters.every((l) => l.state === STATE.AWAKE);
  const reset = () => letters.forEach((l) => l.reset());
  const setDebug = (v) => letters.forEach((l) => { l.debug.visible = v; });
  const states = () => letters.map((l) => `${l.char}:${l.state}`).join('  ');

  return { object: group, layout, update, handleGesture, allAwake, reset, setDebug, states, letters };
}
