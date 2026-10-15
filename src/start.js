// start.js — pantalla de inicio. Pide un clic para comenzar la aventura. Ese clic es también
// el gesto que el navegador exige para encender el audio, así que desbloquea el sonido y da
// paso al cuento. No nombra la palabra (no adelanta DISNEY): invita a encender la luz.
import { CONFIG } from './config.js';
import { unlockAudio } from './audio.js';

export function createStartMenu({ onStart }) {
  const S = CONFIG.start;

  // Cinzel: la misma tipografía del cuento y las letras.
  const face = document.createElement('style');
  face.textContent = `
    @font-face{font-family:'CinzelStart';src:url('${import.meta.env.BASE_URL}fonts/Cinzel-Bold.woff') format('woff');font-weight:700}
    #start{position:fixed;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;
      justify-content:center;gap:22px;background:rgba(4,3,10,.62);cursor:pointer;
      opacity:0;transition:opacity .6s ease;user-select:none;-webkit-user-select:none}
    #start.on{opacity:1}
    #start .eyebrow{font:700 clamp(13px,1.6vw,18px) 'CinzelStart',serif;letter-spacing:.32em;
      color:#e9b44c;text-transform:uppercase;opacity:.9}
    #start .btn{font:700 clamp(20px,3vw,34px) 'CinzelStart',serif;letter-spacing:.12em;color:#fff1b0;
      padding:.7em 1.6em;border:1.5px solid rgba(233,180,76,.8);border-radius:999px;
      background:rgba(11,8,22,.5);box-shadow:0 0 28px rgba(233,180,76,.35),inset 0 0 18px rgba(233,180,76,.15);
      animation:startGlow 2.6s ease-in-out infinite}
    #start:hover .btn{box-shadow:0 0 46px rgba(255,214,120,.6),inset 0 0 24px rgba(233,180,76,.3)}
    #start .hint{font:400 clamp(12px,1.4vw,16px) system-ui,sans-serif;color:#cfc7e6;opacity:.85}
    @keyframes startGlow{0%,100%{transform:scale(1);opacity:.92}50%{transform:scale(1.035);opacity:1}}
  `;
  document.head.appendChild(face);

  const root = document.createElement('div');
  root.id = 'start';
  root.innerHTML = `
    <div class="eyebrow">${S.eyebrow}</div>
    <div class="btn">${S.button}</div>
    <div class="hint">${S.hint}</div>`;
  document.body.appendChild(root);

  let visible = false;

  function begin() {
    if (!visible) return;
    visible = false;
    unlockAudio();               // este clic es el gesto que enciende el sonido
    root.classList.remove('on');
    setTimeout(() => { if (!visible) root.style.display = 'none'; }, 650);
    onStart(performance.now());
  }
  root.addEventListener('click', begin);
  window.addEventListener('keydown', (e) => {
    if (visible && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); begin(); }
  });

  function show() {
    visible = true;
    root.style.display = 'flex';
    requestAnimationFrame(() => root.classList.add('on'));
  }

  return { show, isVisible: () => visible };
}
