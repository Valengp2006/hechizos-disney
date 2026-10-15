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
import { createGravity } from './spells/i.js';
import { createRibbon } from './spells/s.js';
import { createLightning } from './spells/n.js';
import { createLighthouse } from './spells/e.js';
import { createBloom } from './spells/y.js';

// Hechizos por letra. Las letras sin entrada usan el destello placeholder.
const SPELLS = { D: createPortal, I: createGravity, S: createRibbon, N: createLightning, E: createLighthouse, Y: createBloom };

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
    this.cRose = rgb(colors.rose);
    this.cAmber = rgb(colors.amber);
    this.cAwake = rgb(colors.awake);

    this.group = new THREE.Group();
    // `body` es el cuerpo de la letra (contorno + puntos): lo único que se puede estirar.
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.lift = 0; // cuánto empuja el hechizo al polvo ambiental (0..1)
    this.warmth = 0; // cuánto dora el hechizo al polvo ambiental (0..1)
    this.chargeLevel = 0; // 0..1: cuánto lleva agarrada la letra (solo Y lo usa)
    this.hint = 0;        // 0..1: cuánto insinúa el polvo su gesto (letra sensible)
    this.gestureProgress = 0; // 0..1: cuánto de SU gesto lleva el trazo actual (lo pone el reparto)
    this.listenHint = 0;  // 0..1 suavizado de lo anterior: la letra se entreabre mientras se acierta
    this.progress = 0;    // 0..1: avance del hechizo mientras está encantada
    this.cheerT = 1e9;    // ms desde el último saltito de alegría (letra despierta)
    this.exciteT = 1e9;   // ms desde el último avivamiento (letra aún dormida)
    this.prevState = STATE.LATENT;
    this.reached = new Set(); // letras que mi hechizo ya tocó (una vez por conjuro)
    this.peers = [];

    // Contorno (línea fina) y puntos muestreados: la letra "ya construida".
    this.lineMat = new THREE.LineBasicMaterial({
      color: this.cRose, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    for (const c of this.shape.contours) {
      const pts = c.points.map((p) => new THREE.Vector3(p.x, p.y, 0));
      if (c.closed) pts.push(pts[0].clone());
      this.body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.lineMat));
    }
    this.pointMat = new THREE.PointsMaterial({
      map: haloTexture(), color: this.cRose, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, size: 7, sizeAttenuation: false,
    });
    this.body.add(new THREE.Points(
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
      map: haloTexture(), color: this.cAmber, transparent: true, opacity: 0, depthWrite: false,
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
      color: this.cAmber, transparent: true, opacity: 0.22, depthWrite: false,
    });
    this.debug = new THREE.Group();
    for (const c of this.shape.contours) {
      const pts = c.points.map((p) => new THREE.Vector3(p.x, p.y, 0));
      if (c.closed) pts.push(pts[0].clone());
      this.debug.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.debugMat));
    }
    this.debug.visible = false;
    this.body.add(this.debug);

    // Hechizo propio de la letra (si existe). Se crea una vez; solo se anima.
    this.spell = SPELLS[char] ? SPELLS[char](this) : null;
    if (this.spell?.anchor) {
      // El destello nace donde el hechizo lo pide (p. ej. el centro de la letra).
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
    this.flashMat.size = Math.min(sizePx * 1.2, 260); // tope: en letras grandes el halo quemaba
    // Densidad constante en pantalla: con letras pequeñas los puntos están más juntos, así
    // que se hacen más chicos para que la luz no se sature (y crecen un poco en las grandes).
    const spacingPx = CONFIG.font.sampleSpacing * this.scale;
    this.pointMat.size = Math.min(8, Math.max(3, spacingPx * 1.4));
  }

  // Distancia (px) de un punto a la caja de la letra; 0 si está dentro.
  distanceTo(x, y) {
    const w = this.shape.width * this.scale, h = this.shape.height * this.scale;
    const dx = Math.max(this.pos.x - x, 0, x - (this.pos.x + w));
    const dy = Math.max(this.pos.y - y, 0, y - (this.pos.y + h));
    return Math.hypot(dx, dy);
  }

  // Estira el cuerpo hacia arriba manteniendo fija la base de la letra.
  setStretch(s) {
    this.body.scale.y = s;
    this.body.position.y = this.shape.height * (1 - s);
  }

  set(state) { this.state = state; this.stateT = 0; }

  // --- transiciones (nombres del modelo) ---
  listen() { this.set(STATE.LISTENING); }
  // `trail` es el trazo del gesto (px de pantalla): algunos hechizos lo usan (p. ej. la cinta).
  conjure(trail, info) { this.set(STATE.CONJURED); this.spell?.start?.(trail, info); }
  awaken() { this.set(STATE.AWAKE); }
  reset() { this.set(STATE.LATENT); this.spell?.reset(); this.reached.clear(); }
  // Contagio: una letra despierta da un saltito; una dormida se aviva un instante.
  cheer() { this.cheerT = 0; }
  excite() { this.exciteT = 0; }

  // `near`: el punto de atención está cerca (solo importa en latente/sensible).
  update(dtMs, timeS, near) {
    const L = CONFIG.letters;
    this.stateT += dtMs;
    this.cheerT += dtMs;
    this.exciteT += dtMs;

    if (this.state === STATE.LATENT || this.state === STATE.SENSITIVE) {
      this.state = near ? STATE.SENSITIVE : STATE.LATENT;
    }
    // Gesto a medias: si el trazo va por buen camino, la letra se entreabre poco a poco.
    const lhTarget = this.state === STATE.SENSITIVE ? this.gestureProgress : 0;
    this.listenHint += (lhTarget - this.listenHint) * Math.min(1, (dtMs / 1000) * 6);

    let lineOp = 0, pointOp = 0, dustOp = L.latentDustOpacity, tremble = 0, flashOp = 0;
    let color = this.cRose;
    let stretch = 1;
    this.lift = 0;
    this.warmth = 0;

    switch (this.state) {
      case STATE.SENSITIVE:
        dustOp += L.sensitiveGain;
        tremble = L.trembleAmplitude;
        // Entreabrirse en proporción al avance del gesto propio (rosa suave).
        lineOp = L.listeningOpacity * this.listenHint;
        pointOp = L.listeningOpacity * 0.55 * this.listenHint;
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
          stretch = o.stretch ?? 1;
          this.lift = o.lift ?? 0;
          this.warmth = o.warmth ?? 0;
          this.progress = k;
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

    // Contagio: saltito de alegría (despierta) o avivamiento (dormida), por reglas fijas.
    const cheerP = this.cheerT < 500 ? Math.sin((Math.PI * this.cheerT) / 500) : 0;
    const exciteP = this.exciteT < 900 ? 1 - this.exciteT / 900 : 0;
    if (this.state === STATE.AWAKE && cheerP > 0) {
      lineOp = Math.min(1, lineOp * (1 + 0.6 * cheerP));
      stretch *= 1 + 0.1 * cheerP;
    } else if ((this.state === STATE.LATENT || this.state === STATE.SENSITIVE ||
                this.state === STATE.LISTENING) && exciteP > 0) {
      dustOp += 0.5 * exciteP;
      lineOp = Math.max(lineOp, 0.3 * exciteP);
      pointOp = Math.max(pointOp, 0.2 * exciteP);
      tremble = Math.max(tremble, L.trembleAmplitude * exciteP);
    }
    this.setStretch(stretch);
    // Carga (agarre sostenido): el hechizo muestra que se está preparando.
    if (this.spell?.charge && this.state !== STATE.CONJURED && this.state !== STATE.AWAKE) {
      this.spell.charge(this.chargeLevel, timeS);
    }
    this.lineMat.color.copy(color);
    this.pointMat.color.copy(color);
    this.lineMat.opacity = lineOp;
    this.pointMat.opacity = pointOp;
    this.flashMat.opacity = flashOp * CONFIG.visual.flashGain;
    this.dustMat.opacity = Math.min(1, dustOp);

    // Polvo: se estremece (oscila con fase propia) cuando la letra está sensible.
    // Además, al estar sensible, el polvo insinúa el gesto que la despierta (una pista
    // sin texto): gira (círculo), sube (subir), se mece (barrido), vibra de lado a lado
    // (zigzag), respira (quieto) o se recoge (agarrar). `hint` entra y sale con suavidad.
    const target = this.state === STATE.SENSITIVE ? 1 : 0;
    this.hint += (target - this.hint) * Math.min(1, (dtMs / 1000) * 4);
    const amp = tremble / this.scale;
    const n = this.dustPhase.length;
    const w = this.shape.width, h = this.shape.height, cx = w / 2, cy = h / 2;
    const hintAmt = this.hint * L.hintStrength;
    for (let i = 0; i < n; i++) {
      const ph = this.dustPhase[i];
      const f = tremble > 0 ? 38 : 0.7; // sensible: vibra rápido; latente: respira lento
      const a = tremble > 0 ? amp : 3 / this.scale;
      let bx = this.dustBase[i * 2], by = this.dustBase[i * 2 + 1];
      if (hintAmt > 0.001) {
        let hx = bx, hy = by;
        switch (this.gesture) {
          case 'circle': { // el polvo orbita alrededor del centro de la letra
            const th = timeS * 1.4;
            const dx = bx - cx, dy = by - cy;
            hx = cx + dx * Math.cos(th) - dy * Math.sin(th);
            hy = cy + dx * Math.sin(th) + dy * Math.cos(th);
            break;
          }
          case 'rise': { // sube en ciclos y reaparece abajo
            const span = h * 1.4;
            hy = by - ((timeS * 38 + i * 9) % span);
            break;
          }
          case 'sweep': // se mece de lado a lado, todo junto
            hx = bx + Math.sin(timeS * 2.2) * w * 0.35;
            break;
          case 'zigzag': { // vaivén seco: onda triangular rápida
            const t = (timeS * 3.2 + ph * 0.05) % 1;
            hx = bx + (Math.abs(t * 2 - 1) - 0.5) * w * 0.5;
            break;
          }
          case 'grab': { // se contrae hacia el centro y se suelta
            const k = 1 - 0.35 * (0.5 + 0.5 * Math.sin(timeS * 3));
            hx = cx + (bx - cx) * k; hy = cy + (by - cy) * k;
            break;
          }
          default: break; // 'still': no se mueve (la calma es el gesto); solo respira abajo
        }
        bx += (hx - bx) * hintAmt;
        by += (hy - by) * hintAmt;
      }
      this.dustPos[i * 3] = bx + Math.sin(timeS * f + ph) * a;
      this.dustPos[i * 3 + 1] = by + Math.cos(timeS * f * 1.3 + ph) * a;
    }
    // Quieto: en vez de moverse, el polvo respira (brillo) cuando la letra es sensible.
    if (this.gesture === 'still' && this.hint > 0.01) {
      this.dustMat.opacity = Math.min(1, this.dustMat.opacity * (0.75 + 0.5 * Math.sin(timeS * 2.2)));
    }
    this.dustGeo.attributes.position.needsUpdate = true;
  }
}

export function createLetters(font) {
  const letters = [...CONFIG.font.word].map((ch, i) => new Letter(ch, font, i));
  const group = new THREE.Group();
  letters.forEach((l) => { group.add(l.group); l.peers = letters; });
  let screen = { w: window.innerWidth, h: window.innerHeight };

  function layout(w, h) {
    screen = { w, h };
    for (const l of letters) {
      const p = CONFIG.letters.layout[l.char];
      // El tamaño sigue al alto, pero en pantallas estrechas (vertical) se limita por el ancho.
      l.place(p.x * w, p.y * h, p.size * Math.min(h, w * 0.75));
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
  function update(dtMs, timeS, input, progress = {}) {
    target = input.active ? nearest(input.x, input.y) : null;
    // Agarrar sobre una letra que se conjura agarrando (Y): se "carga" mientras se mantiene.
    for (const l of letters) {
      const holding = input.grab && l === target && l.gesture === 'grab';
      l.chargeLevel = holding
        ? Math.min(1, l.chargeLevel + dtMs / CONFIG.spells.chargeMs)
        : Math.max(0, l.chargeLevel - dtMs / 200);
      l.gestureProgress = l === target ? (progress[l.gesture] || 0) : 0;
      l.update(dtMs, timeS, l === target);
    }
    chains();
  }

  // Un gesto reconocido llega con su trazo. Lo recibe la letra (latente/sensible) que el
  // final del trazo (gestureTargetMs) toca más de cerca: menor distancia entre un punto
  // del trazo y su caja. Ni el centro ni el inicio sirven: se contaminan con la aproximación.
  function handleGesture(name, trail, input, info) {
    let pts = [{ x: input.x, y: input.y }];
    if (trail && trail.length) {
      const tEnd = trail[trail.length - 1].t;
      const recent = trail.filter((p) => p.t >= tEnd - CONFIG.letters.gestureTargetMs);
      pts = recent.length ? recent : trail;
    }
    let l = null, bestD = CONFIG.letters.sensitiveRadius;
    const dists = [];
    for (const c of letters) {
      if (c.state !== STATE.LATENT && c.state !== STATE.SENSITIVE) continue;
      let d = Infinity;
      for (let i = 0; i < pts.length; i += 3) d = Math.min(d, c.distanceTo(pts[i].x, pts[i].y));
      d = Math.min(d, c.distanceTo(pts[pts.length - 1].x, pts[pts.length - 1].y));
      dists.push(`${c.char}:${Math.round(d)}`);
      if (d <= bestD) { l = c; bestD = d; }
    }
    const x = pts[pts.length - 1].x, y = pts[pts.length - 1].y;
    const dbg = { x, y, n: pts.length, dists: dists.join(' ') };
    if (!l) return null;
    if (l.gesture === name) { l.conjure(trail, info); return { letter: l.char, result: 'conjure', ...dbg }; }
    l.listen();
    return { letter: l.char, result: 'listen', ...dbg };
  }

  // ---- Encadenamientos: "la alegría se contagia" (reglas fijas contacto -> efecto) ----
  const center = (l) => ({
    x: l.pos.x + (l.shape.width * l.scale) / 2,
    y: l.pos.y + (l.shape.height * l.scale) / 2,
  });
  const asleep = (l) => l.state === STATE.LATENT || l.state === STATE.SENSITIVE || l.state === STATE.LISTENING;
  function react(l) { if (l.state === STATE.AWAKE) l.cheer(); else if (asleep(l)) l.excite(); }

  function chains() {
    for (const src of letters) {
      const live = src.state === STATE.CONJURED;
      if (!live) src.reached.clear();
      // 1) Las ondas de la D, al pasar sobre otra letra, la avivan (o la hacen saltar).
      if (live && src.spell?.reach) {
        const c = center(src), r = src.spell.reach();
        for (const o of letters) {
          if (o === src || src.reached.has(o)) continue;
          const oc = center(o);
          const half = 0.5 * Math.max(o.shape.width, o.shape.height) * o.scale;
          if (Math.hypot(oc.x - c.x, oc.y - c.y) - half <= r) { src.reached.add(o); react(o); }
        }
      }
      // 2) La cinta de la S, al cruzar una letra despierta, la hace saltar.
      if (live && src.spell?.head) {
        const h = src.spell.head();
        if (h) for (const o of letters) {
          if (o === src || src.reached.has(o) || o.state !== STATE.AWAKE) continue;
          if (o.distanceTo(h.x, h.y) < 24) { src.reached.add(o); o.cheer(); }
        }
      }
      // 3) La chispa de la N llega a la letra más cercana y la enciende un instante.
      const arrived = src.spell?.takeArrival?.();
      if (arrived) react(arrived);
    }
    // 4) Al despertar una letra, todas las despiertas parpadean juntas: un "¡sí!" compartido.
    for (const l of letters) {
      if (l.state === STATE.AWAKE && l.prevState !== STATE.AWAKE) {
        letters.forEach((o) => { if (o.state === STATE.AWAKE) o.cheer(); });
      }
      l.prevState = l.state;
    }
  }

  const allAwake = () => letters.every((l) => l.state === STATE.AWAKE);
  const reset = () => letters.forEach((l) => l.reset());
  // Empuje del hechizo sobre el polvo ambiental: el mayor de las letras en curso.
  const lift = () => Math.max(0, ...letters.map((l) => l.lift));
  const warmth = () => Math.max(0, ...letters.map((l) => l.warmth));
  const setDebug = (v) => letters.forEach((l) => { l.debug.visible = v; });
  const states = () => letters.map((l) => `${l.char}:${l.state}`).join('  ');

  return { object: group, layout, update, handleGesture, allAwake, reset, lift, warmth, current: () => target, setDebug, states, letters };
}
