// guide.js — guía siempre visible (HTML sobre el canvas).
// Una barra al pie con los seis pasos, uno por letra, en un orden fijo (guide.order) que NO es
// el de la palabra:
//   hecho  -> el objeto, encendido, con una marca y la letra ya revelada
//   actual -> con su gesto animado, qué hacer y una indicación de dónde (la letra late)
//   por hacer -> el objeto apagado y una "?" (la letra no se revela hasta que despierta)
// Así la guía enseña qué hacer sin adelantar la palabra DISNEY.
// El paso actual es la letra pendiente más cercana al cursor o, si no hay ninguna cerca,
// la primera pendiente del orden de la guía. Al terminar, cuenta lo que pasa en el final.
import { CONFIG } from './config.js';

const ICONS = {
  D: '<path d="M10 14c0-9 18-9 20 0" fill="none" stroke="#f6d27a" stroke-width="2.5"/><path d="M10 14h14c12 0 18 8 18 16s-6 16-18 16H10z" fill="#e0883a"/><path d="M17 20h7c7 0 11 4 11 10s-4 10-11 10h-7z" fill="#0b0816"/><circle cx="26" cy="33" r="3.4" fill="#f6d27a"/>',
  I: '<path d="M24 3c5 6 5 11 0 14-5-3-5-8 0-14z" fill="#ffb347"/><rect x="19" y="18" width="10" height="22" rx="2" fill="#f5e8c8"/><rect x="13" y="39" width="22" height="5" rx="2" fill="#e9b44c"/>',
  S: '<path d="M35 11c-4-6-22-5-22 4s22 6 22 17-19 12-23 5" fill="none" stroke="#f2848d" stroke-width="7" stroke-linecap="round"/>',
  N: '<path d="M11 41V9l26 32V9" fill="none" stroke="#f4c95d" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><path d="M24 15l2.6 7.4L34 25l-7.4 2.6L24 35l-2.6-7.4L14 25l7.4-2.6z" fill="#fff4c4"/>',
  E: '<rect x="11" y="10" width="5.5" height="31" rx="2" fill="#e9b44c"/><path d="M11 10c9-7 25-6 30 7" fill="none" stroke="#f6d27a" stroke-width="3"/><path d="M16 17h22M16 25h19M16 33h16" stroke="#f6d27a" stroke-width="2.4" stroke-linecap="round"/>',
  Y: '<path d="M24 45V28M24 28L12 14M24 28L36 14" fill="none" stroke="#5fbf7a" stroke-width="5" stroke-linecap="round"/><g fill="#f48fb1"><circle cx="24" cy="6" r="4"/><circle cx="29.2" cy="9" r="4"/><circle cx="29.2" cy="15" r="4"/><circle cx="24" cy="18" r="4"/><circle cx="18.8" cy="15" r="4"/><circle cx="18.8" cy="9" r="4"/></g><circle cx="24" cy="12" r="3.4" fill="#ffd25e"/>',
};

// Gesto animado (64x64): trazo tenue y un punto de luz que lo recorre.
const dot = (path, dur = '2.4s') =>
  `<circle r="5" fill="#fff1b0"><animateMotion dur="${dur}" repeatCount="indefinite" path="${path}"/></circle>`;
const PICTO = {
  circle: `<circle cx="32" cy="32" r="20" fill="none" stroke="#f6d27a" stroke-opacity=".4" stroke-width="3"/>${dot('M32 12 a20 20 0 1 1 -0.01 0')}`,
  rise: `<path d="M32 56V10M21 21L32 10l11 11" fill="none" stroke="#f6d27a" stroke-opacity=".5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dot('M32 56 V12', '1.8s')}`,
  sweep: `<path d="M6 32H58M47 21l11 11-11 11" fill="none" stroke="#f6d27a" stroke-opacity=".5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dot('M6 32 H56', '1.8s')}`,
  zigzag: `<polyline points="6,48 20,16 32,48 44,16 58,48" fill="none" stroke="#f6d27a" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>${dot('M6 48 L20 16 L32 48 L44 16 L58 48', '2s')}`,
  still: '<circle cx="32" cy="32" r="8" fill="#fff1b0"/><circle cx="32" cy="32" r="14" fill="none" stroke="#f6d27a" stroke-width="3"><animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values=".9;.15;.9" dur="2.4s" repeatCount="indefinite"/></circle>',
  grab: '<circle cx="32" cy="32" r="22" fill="none" stroke="#f6d27a" stroke-width="3"><animate attributeName="r" values="22;7;7;22" keyTimes="0;.5;.7;1" dur="2.6s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="5" fill="#fff1b0"/>',
};
// Símbolo estático del gesto para las fichas pendientes (no adelanta la forma de la letra).
const SYMBOL = {
  circle: '<circle cx="24" cy="24" r="14" fill="none" stroke="#cfc7e6" stroke-width="3.5"/><path d="M24 7l6 7h-12z" fill="#cfc7e6"/>',
  rise: '<path d="M24 42V8M14 18l10-10 10 10" fill="none" stroke="#cfc7e6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  sweep: '<path d="M6 24h36M32 14l10 10-10 10" fill="none" stroke="#cfc7e6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  zigzag: '<polyline points="6,36 15,12 24,36 33,12 42,36" fill="none" stroke="#cfc7e6" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>',
  still: '<circle cx="24" cy="24" r="5" fill="#cfc7e6"/><circle cx="24" cy="24" r="14" fill="none" stroke="#cfc7e6" stroke-width="3" stroke-dasharray="3 5"/>',
  grab: '<circle cx="24" cy="24" r="14" fill="none" stroke="#cfc7e6" stroke-width="3.5"/><circle cx="24" cy="24" r="5" fill="#cfc7e6"/>',
};
const GESTURE_KEY = { circle: 'circle', rise: 'rise', sweep: 'sweep', zigzag: 'zigzag', still: 'still', grab: 'grab' };

export function createGuide({ letters }) {
  const G = CONFIG.guide;
  // Orden de las fichas: guide.order, y al final las letras de la palabra que falten.
  const word = [...new Set([...G.order, ...CONFIG.font.word])].filter((c) => CONFIG.font.word.includes(c));

  const style = document.createElement('style');
  style.textContent = `
    #guide{position:fixed;left:50%;bottom:8px;transform:translateX(-50%);width:min(94vw,700px);
      font:13px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;color:#efe9ff;pointer-events:none;
      background:rgba(11,8,22,.8);border:1px solid rgba(233,180,76,.4);border-radius:12px;
      padding:6px 12px 7px;display:none;box-sizing:border-box;z-index:5}
    #guide .row{display:flex;align-items:center;gap:12px}
    #guide .pic{flex:0 0 46px;height:46px}
    #guide .txt{flex:1;min-width:0}
    #guide .step{font:600 11px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#e9b44c}
    #guide .big{font:700 17px/1.2 system-ui;margin:2px 0 0}
    #guide .small{font-size:12px;color:#cfc7e6}
    #guide .chips{display:flex;gap:6px;margin-top:6px;justify-content:space-between}
    #guide .chip{flex:1;text-align:center;border-radius:8px;padding:3px 2px 2px;border:1px solid transparent;opacity:.4;position:relative}
    #guide .chip svg{width:24px;height:24px;display:block;margin:0 auto;filter:grayscale(1) brightness(.7)}
    #guide .chip b{display:block;font:700 11px/1.1 system-ui;margin-top:1px}
    #guide .chip i{display:block;font:normal 10px/1.1 system-ui;color:#cfc7e6}
    #guide .chip.cur{opacity:1;border-color:#e9b44c;background:rgba(233,180,76,.12)}
    #guide .chip.cur svg{filter:none}
    #guide .chip.done{opacity:1}
    #guide .chip.done svg{filter:none}
    #guide .chip.done::after{content:'\\2713';position:absolute;top:1px;right:6px;color:#5fbf7a;font-weight:700}
    @media (max-width:560px){#guide .big{font-size:15px}#guide .chip i{display:none}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'guide';
  root.innerHTML = `
    <div class="row">
      <svg class="pic" viewBox="0 0 64 64" aria-hidden="true"></svg>
      <div class="txt"><div class="step"></div><div class="big"></div><div class="small"></div></div>
    </div>
    <div class="chips"></div>`;
  document.body.appendChild(root);

  const pic = root.querySelector('.pic');
  const stepEl = root.querySelector('.step');
  const bigEl = root.querySelector('.big');
  const smallEl = root.querySelector('.small');
  const chipsEl = root.querySelector('.chips');
  const chips = word.map((ch) => {
    const s = G.steps[ch];
    const el = document.createElement('div');
    el.className = 'chip';
    // La letra se revela solo al despertar (hasta entonces, "?"): no se adelanta la palabra.
    el.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${SYMBOL[CONFIG.letters.gestures[ch]] || ''}</svg><b>?</b><i>${s ? s.label : ''}</i>`;
    chipsEl.appendChild(el);
    return el;
  });

  let sig = '';

  // `tutLetter`: letra en turno del mini-tutorial; `phase`: fase del final; `hidden`: durante el cuento.
  function update({ current, tutLetter, phase, hidden }) {
    if (!G.enabled || hidden) { root.style.display = 'none'; return null; }
    root.style.display = 'block';
    // Las letras en el orden de la guía (no el de la palabra).
    const ls = word.map((ch) => letters.letters.find((l) => l.char === ch)).filter(Boolean);
    const doneSet = ls.map((l) => l.state === 'awake' || l.state === 'conjured');
    const pending = ls.filter((l, i) => !doneSet[i]);
    const playing = phase === 'play';

    // Paso actual: la del tutorial, la pendiente más cercana al cursor, o la primera pendiente.
    let target = null;
    if (playing) {
      if (tutLetter) target = tutLetter;
      else if (current && pending.includes(current)) target = current;
      else target = pending[0] || null;
    }
    const near = !!(current && target === current);

    // Para no tocar el DOM cada frame, solo se reescribe cuando cambia algo.
    const key = [phase, target ? target.char : '-', near ? 1 : 0, doneSet.join('')].join('|');
    if (key !== sig) {
      sig = key;
      const n = doneSet.filter(Boolean).length;
      chips.forEach((el, i) => {
        el.className = `chip${doneSet[i] ? ' done' : ''}${target && ls[i] === target ? ' cur' : ''}`;
        el.querySelector('b').textContent = doneSet[i] ? ls[i].char : '?';
        // Pendiente: símbolo del gesto. Hecha: el objeto (y con él la letra), recién entonces.
        el.querySelector('svg').innerHTML = doneSet[i] ? (ICONS[ls[i].char] || '') : (SYMBOL[ls[i].gesture] || '');
      });
      if (!playing) {
        pic.innerHTML = '';
        stepEl.textContent = '¡Lo lograste!';
        bigEl.textContent = 'La palabra despertó';
        smallEl.textContent = phase === 'rest'
          ? 'Cuando te vayas, volverá a dormir.'
          : 'Mira cómo se arma el castillo con sus letras…';
      } else if (target) {
        const s = G.steps[target.char];
        pic.innerHTML = PICTO[GESTURE_KEY[target.gesture]] || '';
        // Sin nombrar la letra: se habla del objeto (la campana, la vela...).
        stepEl.textContent = `${n} de ${ls.length} despiertas · ahora: ${s.article} ${s.name}`;
        bigEl.textContent = s.text;
        smallEl.textContent = near ? 'Hazlo aquí, junto a la letra.' : 'Acércate a la letra que late en la oscuridad.';
      }
    }
    return playing ? target : null;
  }

  return { update, setVisible: (v) => { G.enabled = v; } };
}
