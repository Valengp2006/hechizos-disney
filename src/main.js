// main.js — arranque y ciclo de p5 (modo global importado como módulo).
import p5 from 'p5';
import { CONFIG } from './config.js';

new p5((p) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.noStroke();
  };

  p.draw = () => {
    const [r, g, b] = CONFIG.visual.background;
    p.background(r, g, b);
  };

  p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
});
