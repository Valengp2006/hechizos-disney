# 2026-10-15 — Mini-tutorial con demostración de cada minijuego

## Problema
Con los minijuegos, el mini-tutorial seguía mostrando solo el gesto que abre cada letra: no enseñaba el juego en sí.

## Qué se hizo
Cada letra pasa por dos momentos (`tutorial.openMs` y `tutorial.playMs`):
1. **open (1.5 s):** su objeto (vista previa) y el gesto dibujado con luz; la guía dice "1 · <gesto>".
2. **play (3.2 s):** su minijuego corre **solo**, jugado por un cursor fantasma con un guion fijo por letra; la guía dice "2 · <qué se hace>" y la pista.

Guiones del cursor fantasma (deterministas): D da vueltas alrededor de la campana; I junta luciérnagas abajo y las sube a la mecha; S sigue exactamente al guía de la cinta (`game.leader()`); N agita; E se queda quieto; Y mantiene 1.5 s y suelta.

## Cómo funciona
- `Letter.startDemo(input)` / `stopDemo()`: el minijuego de la letra se actualiza con una entrada falsa y se reinicia al completarse; no cambia el estado de la letra ni dispara el hechizo.
- El cursor fantasma reutiliza la luz-invitación (más tenue).
- Se salta con un clic; la guía lo recuerda ("clic para saltar").

## Duración
6 letras x (1.5 + 3.2 + 0.25) s ≈ 30 s, más ~9 s de cuento. Para una exhibición puede ser largo: bajar `tutorial.playMs`, o dejar el tutorial solo para quien se atasca.

## A observar con personas
- ¿Entienden el minijuego tras verlo una vez? ¿O prefieren descubrirlo?
- ¿La demostración les quita ganas de explorar?
