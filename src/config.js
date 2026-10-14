// config.js — TODOS los parámetros del sistema viven aquí.
// Regla: ninguna otra pieza del código tiene números "mágicos".
// Cada parámetro dice qué controla y qué esperar si se sube o se baja.

export const CONFIG = {
  // ---------- Modo ----------
  mode: {
    // Modo con el que arranca: 'performance' (público) o 'dev' (depuración).
    // También se puede forzar con ?dev en la URL; la tecla M lo alterna.
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
    // Separación (px) entre puntos muestreados sobre el contorno.
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
      magic: [190, 170, 255],   // lila durante la magia
      ice: [170, 210, 255],     // azul hielo
      awake: [255, 205, 110],   // dorado: letra despierta
    },
    // Escala del halo de cada luz. Más = halo más grande y suave.
    glow: 1.2,
    // Largo de la estela del punto de luz (en muestras, 1 por frame). Más = trazos más largos.
    trailLength: 40,
    // Tamaño (px) del punto de luz del jugador.
    pointSize: 38,
    // Semilla del polvo: fija dónde nace cada partícula (misma semilla = mismo polvo).
    dustSeed: 7,
    // Tamaño (px) y brillo base 0..1 del polvo. Casi invisible a propósito.
    dustSize: 10,
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
    circle: {
      minAngleDeg: 300,       // ángulo acumulado mínimo para contar como círculo
      radiusTolerance: 0.35,  // variación relativa máxima del radio
    },
    rise: {
      minDistance: 160,       // recorrido vertical mínimo (px) hacia arriba
      maxLateralRatio: 0.35,  // desviación lateral máxima / recorrido vertical
    },
    sweep: {
      minDistance: 240,       // recorrido horizontal mínimo (px)
      maxVerticalRatio: 0.35, // desviación vertical máxima / recorrido horizontal
    },
    zigzag: {
      minSignChanges: 4,      // cambios de signo de la velocidad horizontal
      minAmplitude: 40,       // amplitud mínima de cada vaivén (px)
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
    // Distancia (px) al punto de atención para pasar a "sensible".
    sensitiveRadius: 140,
    // Cuánto dura el estado "escuchando" (letra entreabierta) antes de apagarse (ms).
    listeningMs: 600,
  },

  // ---------- Hechizos ----------
  spells: {
    durationMs: { D: 4000, I: 4000, S: 5000, N: 3000, E: 5000, Y: 6000 },
    portalCopies: 12,         // D: copias del contorno hacia el fondo
    riseSpeed: 90,            // I: velocidad de ascenso del polvo (px/s)
    ribbonLength: 160,        // S: largo de la cinta (muestras)
    constellation: {          // Y: constelación-árbol
      branches: 2,            // ramas por bifurcación
      depth: 4,               // niveles de recursión
    },
  },

  // ---------- Final ----------
  finale: {
    convergeMs: 3000,         // letras vuelan a su lugar en la palabra
    silenceMs: 2000,          // quietud: la palabra se lee entera
    revealMs: 5000,           // astas crecen y aparece el castillo
    idleResetMs: 30000,       // sin interacción -> todo vuelve a la oscuridad
  },
};
