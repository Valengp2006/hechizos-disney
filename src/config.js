// config.js — TODOS los parámetros del sistema viven aquí.
// Regla: ninguna otra pieza del código tiene números "mágicos".
// Cada parámetro dice qué controla y qué esperar si se sube o se baja.

export const CONFIG = {
  // ---------- Introducción (inicio de cuento) ----------
  // Decisión consciente: el encargo pide no explicar el juego con texto; esta frase es
  // narrativa (no da instrucciones) y se registra en la bitácora. Se escribe con la propia
  // tipografía, como un lápiz de luz que traza cada línea.
  intro: {
    enabled: true,
    enabledInDev: false,      // en dev se salta para probar rápido; ?intro en la URL la fuerza
    lines: [
      'Había una vez…',
      'una palabra dormida en la oscuridad.',
      'Esperaba a que alguien la hiciera sonreír.',
    ],
    startDelayMs: 700,        // oscuridad antes de la primera línea
    writeMs: 1500,            // cuánto tarda el lápiz de luz en trazar una línea
    holdMs: 1100,             // cuánto se queda la línea completa
    fadeMs: 700,              // cuánto tarda en apagarse
    gapMs: 250,               // pausa entre líneas
    sizeRatio: 0.075,         // alto de la frase (fracción del lado de referencia de la pantalla)
    widthRatio: 0.8,          // ancho máximo de la frase (fracción del ancho de pantalla)
    y: 0.44,                  // altura de la frase (fracción del alto)
  },

  // ---------- Ayuda por luz (si la persona se atasca) ----------
  help: {
    afterMs: 20000,           // sin despertar ninguna letra durante este tiempo -> dibuja el gesto
    opacity: 0.6,             // brillo máximo del pictograma (0..1)
    sizeRatio: 0.13,          // tamaño del pictograma (fracción del lado de referencia)
    periodMs: 3200,           // lo que tarda el trazo de luz en recorrer el gesto
  },

  // ---------- Letras-objeto ----------
  // Al despertar, cada letra se rellena y se convierte en su objeto, con color propio,
  // iluminado por el cursor sobre la oscuridad. El objeto sale del propio relleno de la letra
  // más unos pocos detalles (asa, llama, sol...), así la letra sigue leyéndose.
  icons: {
    enabled: true,
    ambient: 0.35,            // brillo del objeto lejos del cursor (0 = invisible, 1 = siempre pleno)
    lightRadius: 300,         // alcance (px) de la luz del cursor sobre los objetos
    fadeSpeed: 5,             // qué tan rápido se rellena la letra al despertar
    colors: {
      D: '#e0883a',           // campana (cobre)
      I: '#f5e8c8',           // vela (cera)
      S: '#f2848d',           // cinta
      N: '#f4c95d',           // estrella
      E: '#e9b44c',           // arpa
      Y: '#5fbf7a',           // flor sobre tallo
    },
  },

  // ---------- Guía siempre visible ----------
  // Barra fija con los seis pasos (uno por letra): el paso actual con su gesto animado y qué
  // hacer; los hechos, iluminados. La letra del paso actual "late" en la oscuridad para saber dónde.
  // Decisión consciente: contradice la regla de no explicar con texto; se registra en la bitácora.
  guide: {
    enabled: true,
    reserve: 0.2,             // fracción del alto reservada abajo para la barra (las letras no la tapan)
    beacon: true,             // la letra del paso actual late (brillo del polvo + fantasma tenue)
    beaconStrength: 0.4,      // cuánto brilla su polvo al latir (0..1)
    beaconGhost: 0.16,        // opacidad máxima del fantasma de la letra al latir
    // Orden en que la guía y el mini-tutorial presentan las letras. Es fijo y NO sigue el de la
    // palabra, para no revelar DISNEY antes de que las letras despierten.
    order: ['E', 'S', 'D', 'Y', 'I', 'N'],
    steps: {                  // texto de cada paso
      D: { article: 'la', name: 'campana', label: 'círculo', text: 'Dibuja un círculo' },
      I: { article: 'la', name: 'vela', label: 'subir', text: 'Sube en línea recta' },
      S: { article: 'la', name: 'cinta', label: 'barrer', text: 'Barre de lado a lado' },
      N: { article: 'la', name: 'estrella', label: 'agitar', text: 'Agita el cursor rápido' },
      E: { article: 'la', name: 'arpa', label: 'quieto', text: 'Quédate quieto un momento' },
      Y: { article: 'la', name: 'flor', label: 'agarrar', text: 'Mantén el clic y suelta' },
    },
  },

  // ---------- Mini-tutorial (tras el cuento) ----------
  // Cada letra, en el orden de la palabra, muestra su objeto y dibuja su gesto con luz.
  tutorial: {
    enabled: true,
    enabledInDev: false,      // en dev se salta (salvo ?intro); la tecla T lo lanza
    slotMs: 2300,             // cuánto se queda cada letra (6 letras); el orden es guide.order
  },

  // ---------- Modo ----------
  mode: {
    // Modo con el que arranca: 'performance' (público) o 'dev' (depuración).
    // También se puede forzar con ?dev en la URL; la tecla Tab lo alterna.
    initial: 'performance',
    // En dev, ¿se aplica el reinicio por inactividad? (en performance siempre).
    idleResetInDev: false,
  },

  // ---------- Audio ----------
  audio: {
    // Loop de fondo (archivo propio o de licencia libre). Si no existe, el sistema
    // funciona en silencio y avisa por consola.
    url: 'audio/loop.mp3',
    // Volumen maestro 0..1. Es el único control de nivel de todo el sistema.
    volume: 0.6,
    // Fundido de entrada al primer gesto y al salir del silencio (ms).
    fadeInMs: 3000,
    // Fundido de salida al entrar en el silencio del final (ms).
    fadeOutMs: 800,
  },

  // ---------- Tipografía ----------
  font: {
    // Fuente local (OFL). Provisional: ajustar los hechizos si se cambia.
    url: 'fonts/Cinzel-Bold.woff',
    word: 'DISNEY',
    // Separación entre puntos muestreados sobre el contorno, medida con la letra a su
    // tamaño de referencia (em = 200 px); después escala con la letra.
    // Menos = más puntos (más densidad de luz y más costo).
    sampleSpacing: 6,
    // Segmentos con que se aplana cada curva Bézier. Más = contorno más fino.
    curveSteps: 12,
    // Tamaño de las letras en el modo depuración, como fracción del alto de pantalla.
    debugSizeRatio: 0.35,
  },

  // ---------- Visual ----------
  visual: {
    // Fondo casi negro azulado: la oscuridad es parte del asombro.
    background: [4, 3, 10],
    // Cantidad de partículas de polvo ambiental. Más = más "atmósfera" y más costo de render.
    dustCount: 400,
    // Colores por estado de la letra (RGB).
    colors: {
      rose: [255, 170, 190],    // rosa suave: el primer destello de la magia
      amber: [255, 214, 150],   // ámbar: calidez, luz de luciérnaga
      awake: [255, 205, 110],   // dorado: letra despierta
    },
    // Multiplicador de los destellos grandes de los hechizos (0..1). Bájalo si en pantallas
    // grandes o con proyector el brillo se acumula y quema; 0 los apaga.
    flashGain: 0.7,
    // Escala del halo de cada luz. Más = halo más grande y suave.
    glow: 1.2,
    // Largo de la estela del punto de luz (en muestras, 1 por frame). Más = trazos más largos.
    trailLength: 40,
    // Luz-invitación: cuánto espera sin actividad (ms) antes de pasearse sola, y su brillo 0..1.
    attractAfterMs: 4000,
    attractOpacity: 0.35,
    // Tamaño (px) del punto de luz del jugador.
    pointSize: 38,
    // Semilla del polvo: fija dónde nace cada partícula (misma semilla = mismo polvo).
    dustSeed: 7,
    // Tamaño (px) y brillo base 0..1 del polvo. Casi invisible a propósito.
    dustSize: 8,
    dustOpacity: 0.09,
    // Velocidad de deriva del polvo (px/s). 0 = quieto.
    dustDrift: 6,
    // Radio (px) en que el polvo se aviva al paso del punto de atención, y cuánto (0..1 extra).
    dustReactRadius: 160,
    dustReactGain: 0.6,
  },

  // ---------- Entrada ----------
  hand: {
    // Suavizado 0..1. Más cerca de 1 = más suave pero con más retraso.
    smoothing: 0.6,
    // Confianza mínima de la detección para aceptar la mano.
    minConfidence: 0.7,
    // Distancia pulgar–índice (px) por debajo de la cual hay pellizco (grab).
    pinchThreshold: 40,
  },

  // ---------- Gestos (se evalúan sobre la última ventana de tiempo) ----------
  gestures: {
    // Ventana de trayectoria analizada (ms).
    windowMs: 1000,
    // Fracciones de la ventana en que también se busca un gesto (más recientes). Así un
    // gesto se reconoce en cuanto existe, aunque venga precedido de otro recorrido.
    windowFractions: [1, 0.7, 0.45],
    // Tras reconocer un gesto, pausa (ms) sin reconocer otro. Evita que un mismo
    // movimiento dispare dos hechizos o repita el mismo.
    cooldownMs: 700,
    circle: {
      minAngleDeg: 300,       // ángulo acumulado mínimo para contar como círculo
      radiusTolerance: 0.35,  // variación relativa máxima del radio (desv. estándar / media)
      minRadius: 30,          // radio medio mínimo (px): un temblor no es un círculo
    },
    rise: {
      minDistance: 160,       // recorrido vertical mínimo (px) hacia arriba
      maxLateralRatio: 0.35,  // ancho del trazo / recorrido vertical
      minStraightness: 0.8,   // recorrido neto / alto del trazo (1 = sin vaivén)
    },
    sweep: {
      minDistance: 240,       // recorrido horizontal mínimo (px)
      maxVerticalRatio: 0.35, // alto del trazo / recorrido horizontal
      minStraightness: 0.8,   // recorrido neto / ancho del trazo
    },
    zigzag: {
      minSignChanges: 3,      // cambios de sentido (en x o en y) para contar como "agitar"
      minAmplitude: 30,       // amplitud mínima de cada vaivén (px)
    },
    still: {
      speedThreshold: 12,     // velocidad (px/s) por debajo de la cual está quieto
      durationMs: 1200,       // tiempo mínimo quieto
    },
    grab: {
      minHoldMs: 250,         // tiempo mínimo agarrado antes de soltar
    },
  },

  // ---------- Letras ----------
  letters: {
    // Distancia (px) entre el punto de atención y la caja de la letra para "sensible".
    // Más = la letra se delata de más lejos.
    sensitiveRadius: 140,
    // Para repartir un gesto solo se mira el final del trazo (ms): el recorrido de
    // aproximación a la letra no cuenta. Más = se tolera un gesto más largo/lento.
    gestureTargetMs: 500,
    // Cuánto dura el estado "escuchando" (letra entreabierta) antes de apagarse (ms).
    listeningMs: 600,
    // Gesto que despierta a cada letra (nombres de gestures.js).
    gestures: { D: 'circle', I: 'rise', S: 'sweep', N: 'zigzag', E: 'still', Y: 'grab' },
    // Dónde nace cada letra: centro (fracción del ancho/alto de pantalla) y tamaño de
    // la letra (fracción del alto de pantalla). Distintos a propósito: no están en línea.
    layout: {
      D: { x: 0.20, y: 0.30, size: 0.34 },
      I: { x: 0.40, y: 0.74, size: 0.24 },
      S: { x: 0.60, y: 0.26, size: 0.28 },
      N: { x: 0.84, y: 0.62, size: 0.35 },
      E: { x: 0.22, y: 0.74, size: 0.20 },
      Y: { x: 0.62, y: 0.62, size: 0.28 },
    },
    // Polvo tenue que marca la zona de cada letra latente.
    latentDustCount: 36,
    latentDustOpacity: 0.12,
    // Cuánto insinúa el polvo el gesto de la letra cuando está sensible (0 = nada, 1 = pleno).
    hintStrength: 0.7,
    // Cuánto tiembla el polvo (px) cuando la letra está sensible, y su brillo extra 0..1.
    trembleAmplitude: 5,
    sensitiveGain: 0.45,
    // Brillo máximo del contorno cuando la letra se entreabre (escuchando).
    listeningOpacity: 0.55,
    // Duración del destello placeholder del hechizo (ms); los hechizos reales usan
    // spells.durationMs. Más = destello más lento.
    placeholderSpellMs: 1500,
    // Periodo (ms) de la respiración de una letra despierta, y rango de brillo.
    breathMs: 3200,
    awakeOpacityMin: 0.55,
    awakeOpacityMax: 0.95,
  },

  // ---------- Hechizos ----------
  spells: {
    durationMs: { D: 4000, I: 4000, S: 5000, N: 3000, E: 5000, Y: 6000 },
    // --- D: portal ---
    portalCopies: 12,         // D: copias del contorno hacia el fondo
    portalScaleStep: 0.78,    // D: escala de cada copia respecto a la anterior (más alto = túnel más largo)
    portalTwistDeg: 14,       // D: giro (grados) entre copias consecutivas
    portalFlow: 3,            // D: copias por segundo que "caen" por el túnel
    portalCenter: { x: 0.55, y: 0.5 }, // D: punto de fuga dentro de la letra (fracción de su caja)
    portalRemnantScale: 0.22, // D: tamaño de la copia que queda girando en la panza
    portalRemnantSpinDeg: 40, // D: velocidad de giro de esa copia (grados/s)
    // --- I: gravedad invertida ---
    riseSpeed: 90,            // I: velocidad de ascenso del polvo (px/s)
    riseStretch: 1.6,         // I: cuánto se estira el asta (1.6 = 60 % más alta)
    riseDustPerPoint: 4,      // I: partículas por punto muestreado del contorno (densidad)
    riseFallSpeed: 40,        // I: velocidad (px/s) de la caída "normal" antes de invertirse
    riseReverseMs: 500,       // I: cuánto tarda la gravedad en invertirse (ms). Más = giro más lento
    riseSpread: 0.35,         // I: fracción de la duración en que se sueltan (de abajo hacia arriba)
    riseHeight: 420,          // I: altura (px) a la que el polvo termina de apagarse
    riseGlobalLift: 60,       // I: ascenso (px/s) que el hechizo da al polvo de toda la pantalla
    // --- N: relámpago ---
    boltCount: 4,             // N: descargas que saltan entre las astas (la última sigue la diagonal)
    boltSegments: 14,         // N: tramos de cada descarga (más = más quebrada)
    boltJag: 0.1,             // N: cuánto se quiebra (fracción del alto de la letra)
    boltLife: 0.12,           // N: cuánto dura cada descarga (fracción de la duración total)
    boltStagger: 0.15,        // N: separación entre descargas (fracción de la duración total)
    sparkPulse: 0.06,         // N: cuánto tarda en apagarse el asta que se ilumina (fracción)
    // --- S: cinta de fiesta ---
    ribbonDistance: 0.42,     // S: alcance horizontal de la cinta (fracción del ancho de pantalla)
    ribbonWave: 0.09,         // S: amplitud del ondulado (fracción del alto de pantalla)
    ribbonLoop: 0.07,         // S: radio del rizo final (fracción del alto de pantalla)
    ribbonSpread: 0.28,       // S: cuánto se estira la cinta (fracción de la duración)
    ribbonConfetti: 2,        // S: ecos de luz que deja cada punto (0 = sin confeti)
    // --- E: faro ---
    dawnRayLength: 0.38,      // E: alcance de los haces (fracción del ancho de pantalla)
    dawnRays: 5,              // E: líneas por haz (le dan ancho)
    dawnFanDeg: 9,            // E: ancho del haz (grados)
    dawnSweepDeg: 34,         // E: cuánto barre cada haz a cada lado (grados)
    dawnSweepMs: 4200,        // E: lo que tarda un barrido completo (ms)
    dawnLift: 45,             // E: ascenso suave (px/s) del polvo que toca la luz
    dawnWarmth: 0.85,         // E: cuánto se dora el polvo de la pantalla (0..1)
    // --- Y: floración ---
    chargeMs: 1500,           // Y: tiempo de agarre para la floración máxima
    bloomDepthMin: 2,         // Y: niveles de ramas con un agarre mínimo
    bloomDepthMax: 4,         // Y: niveles de ramas con el agarre máximo
    bloomAngleDeg: 28,        // Y: apertura de cada bifurcación (grados a cada lado)
    bloomRatio: 0.68,         // Y: largo de cada rama respecto a la anterior
    bloomPetals: 6,           // Y: pétalos por flor
  },

  // ---------- Final ----------
  finale: {
    convergeMs: 3000,         // letras vuelan a su lugar en la palabra
    silenceMs: 2000,          // quietud: la palabra se lee entera
    revealMs: 5000,           // astas crecen y aparece el castillo
    idleResetMs: 30000,       // sin interacción -> todo vuelve a la oscuridad
    closingMs: 2500,          // cuánto tarda el castillo en apagarse al reiniciar
    wordWidthRatio: 0.72,     // ancho de la palabra DISNEY respecto al ancho de pantalla
    wordBaseline: 0.78,       // tope (fracción del alto) de la línea base de la palabra; se centra si cabe más arriba
    wordGap: 0.08,            // separación entre letras de la palabra (fracción de su tamaño)
    // Castillo genérico: una torre por letra, de alturas y anchos distintos (asimétrico).
    // Altura de cada torre sobre su letra (fracción del alto de la letra) y ancho (de la letra).
    towerHeights: { D: 0.55, I: 1.5, S: 0.8, N: 1.9, E: 1.1, Y: 0.7 },
    towerWidths:  { D: 0.50, I: 0.45, S: 0.55, N: 0.40, E: 0.50, Y: 0.40 },
    // Torres con almenas (merlones) o con mástil y banderín; nunca techo cónico.
    towerCrown: { D: 'crenels', I: 'mast', S: 'crenels', N: 'mast', E: 'crenels', Y: 'mast' },
    wallHeight: 0.30,         // altura del muro que une las torres (fracción del alto de letra)
    castleLift: 0.6,          // ascenso suave del polvo de la pantalla durante el reposo (0..1)
    castleWarmth: 0.5,        // cuánto se dora ese polvo (0..1)
  },
};
