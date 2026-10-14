# 2026-10-14 — Encadenamientos y final

## Encadenamientos: "la alegría se contagia"
Reglas fijas (contacto -> efecto); ninguna cambia el estado de otra letra:
1. Las ondas de la D, al alcanzar otra letra, la avivan (dormida) o la hacen saltar (despierta).
2. La cabeza de la cinta de la S, al cruzar una letra despierta, la hace saltar.
3. Al final del hechizo de la N, la chispa vuela a la letra más cercana y la aviva.
4. Cuando una letra despierta, todas las despiertas parpadean y saltan a la vez ("¡sí!").
- Implementación: `chains()` en `letter.js`; los hechizos exponen `reach()`, `head()` y `takeArrival()`.

## Final
- **Convergencia** (`convergeMs`): las seis letras vuelan a su lugar en la palabra, con baseline común.
- **Silencio** (`silenceMs`): la música se corta; la palabra se lee entera. La música vuelve con la revelación.
- **Revelación** (`revealMs`): una torre por letra, de alturas y anchos distintos (`towerHeights`, `towerWidths`), con almenas o con mástil y banderín; muros con almenas pequeñas, ventanas cálidas y la panza de la D iluminada como puerta.
- **Reposo:** respira; el polvo de la pantalla sube suave y se dora.
- **Reinicio:** tras `idleResetMs` sin movimiento, el castillo se apaga (`closingMs`) y todo vuelve a la oscuridad. En dev el reinicio está desactivado (`mode.idleResetInDev`).
- Dev: tecla `W` despierta las seis letras para probar el final.

## Propiedad intelectual
- Castillo genérico: asimétrico, sin torre central alta, sin techos cónicos, sin estela de polvo en arco, sin personajes. Las torres salen de las astas/posiciones de las letras.

## Rendimiento
- Tiempo de JS por frame con todo despierto y castillo: ~1.3–1.6 ms (panel dev, "JS x ms").
- El panel del navegador de pruebas se estrangula cuando está oculto (muestra 1–2 fps): no es un problema del sistema.

## Pendiente
- Pruebas con otras personas: ¿qué hicieron?, ¿sonrieron?, ¿lo compartieron con quien tenían al lado?
- Entrada por mano (Hito 5, pospuesto), música (archivo), afinar tamaños con la pantalla del evento.
