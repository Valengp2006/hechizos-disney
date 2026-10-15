// font.js — carga la tipografía y convierte cada letra en datos geométricos:
//   contours: lista de contornos (cada uno, lista de puntos {x,y} y si está cerrado)
//   points:   puntos muestreados a distancia constante sobre los contornos
// Todo es determinista: la misma letra y los mismos parámetros dan siempre los mismos puntos.
// Las coordenadas salen en px con el origen en la esquina superior izquierda de la caja
// de la letra y y creciendo hacia abajo (igual que la pantalla).
import opentype from 'opentype.js';
import { CONFIG } from './config.js';

export async function loadFont(url = CONFIG.font.url) {
  const res = await fetch(import.meta.env.BASE_URL + url);
  if (!res.ok) throw new Error(`No se pudo cargar la fuente: ${url}`);
  return opentype.parse(await res.arrayBuffer());
}

// Aplana los comandos del path (M, L, Q, C, Z) en contornos de polilíneas.
// Se subdivide cada curva en `steps` tramos: así todo el sistema trabaja con puntos.
function flatten(commands, steps) {
  const contours = [];
  let cur = null;
  let last = null;
  for (const c of commands) {
    if (c.type === 'M') {
      cur = { points: [{ x: c.x, y: c.y }], closed: false };
      contours.push(cur);
      last = { x: c.x, y: c.y };
    } else if (c.type === 'L') {
      cur.points.push({ x: c.x, y: c.y });
      last = { x: c.x, y: c.y };
    } else if (c.type === 'Q') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        cur.points.push({
          x: u * u * last.x + 2 * u * t * c.x1 + t * t * c.x,
          y: u * u * last.y + 2 * u * t * c.y1 + t * t * c.y,
        });
      }
      last = { x: c.x, y: c.y };
    } else if (c.type === 'C') {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        cur.points.push({
          x: u ** 3 * last.x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x,
          y: u ** 3 * last.y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y,
        });
      }
      last = { x: c.x, y: c.y };
    } else if (c.type === 'Z') {
      cur.closed = true;
    }
  }
  return contours;
}

// Reparte puntos a distancia `spacing` a lo largo de un contorno (por longitud de arco).
function sampleContour(contour, spacing) {
  const pts = contour.closed ? [...contour.points, contour.points[0]] : contour.points;
  const out = [];
  let carry = 0; // distancia que falta para el próximo punto
  out.push({ ...pts[0] });
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    let d = spacing - carry;
    while (d <= len) {
      const t = d / len;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += spacing;
    }
    carry = len - (d - spacing);
  }
  return out;
}

// Devuelve la geometría de una letra a un tamaño dado (px de alto de em).
export function letterShape(font, char, size) {
  const glyph = font.charToGlyph(char);
  const path = glyph.getPath(0, 0, size);
  const bb = path.getBoundingBox();
  const contours = flatten(path.commands, CONFIG.font.curveSteps);
  // Mueve el origen a la esquina superior izquierda de la caja de la letra.
  for (const c of contours) for (const p of c.points) { p.x -= bb.x1; p.y -= bb.y1; }
  // Temblor de "dibujado a mano": un desplazamiento suave y determinista según la posición,
  // igual para contorno, relleno y puntos (así todo sigue coincidiendo).
  const A = CONFIG.font.wobble * size;
  if (A > 0) {
    const k = char.charCodeAt(0) * 0.37;
    for (const c of contours) {
      for (const p of c.points) {
        const ox = A * (Math.sin(p.y * 0.052 + k) + 0.55 * Math.sin(p.x * 0.097 + k * 1.7));
        const oy = A * (Math.sin(p.x * 0.047 + k * 0.6) + 0.55 * Math.sin(p.y * 0.083 + k * 2.1));
        p.x += ox; p.y += oy;
      }
    }
  }
  const points = contours.flatMap((c) => sampleContour(c, CONFIG.font.sampleSpacing));
  return {
    char,
    contours,
    points,
    width: bb.x2 - bb.x1,
    height: bb.y2 - bb.y1,
    advance: (glyph.advanceWidth / font.unitsPerEm) * size,
  };
}

// Geometría de una frase entera (con avance y kerning de la fuente), a `size` px de em.
// Mismo formato que letterShape: origen arriba a la izquierda de la caja del texto.
export function textShape(font, text, size, spacing = CONFIG.font.sampleSpacing * (size / 200)) {
  const path = font.getPath(text, 0, 0, size);
  const bb = path.getBoundingBox();
  const contours = flatten(path.commands, CONFIG.font.curveSteps);
  for (const c of contours) for (const p of c.points) { p.x -= bb.x1; p.y -= bb.y1; }
  const points = contours.flatMap((c) => sampleContour(c, spacing));
  return { contours, points, width: bb.x2 - bb.x1, height: bb.y2 - bb.y1 };
}

export function wordShapes(font, word, size) {
  return [...word].map((ch) => letterShape(font, ch, size));
}
