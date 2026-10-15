# AGENT.md — Word as a Playable System: "Hechizos" (Disney)

Este archivo es el contexto de trabajo para el agente. Léelo completo antes de tocar código. Si algo aquí contradice una instrucción puntual de Valen en el chat, manda el chat; avísale de la diferencia.

## 1. Qué estamos construyendo

Unidad 7 del curso (12.5% de la nota): un **sistema tipográfico jugable** hecho con tecnologías web, que usa las letras del nombre de una organización para explorar un atributo de su identidad.

- **Organización:** Disney (entretenimiento y narración, público familiar e intergeneracional).
- **Misión que sostiene el proyecto:** **hacer feliz a la gente**. La fuente oficial (Compromiso Disney) la formula como fomentar la felicidad y el bienestar de niños y familias.
- **Atributo:** **magia y fantasía**, al servicio de esa misión: la magia no es el espectáculo sino la forma de regalar alegría.
- **Contexto de uso:** pantalla interactiva en un evento o exhibición.
- **Entradas:** **mano con cámara y mouse, conviviendo** (misma interfaz de entrada para ambos).
- **Verbo central del juego:** *encantar* (hechizar y también deleitar).
- **Idea en una frase:** pantalla casi negra y un único punto de luz que sigue la mano o el cursor. Las letras de DISNEY no se ven. Cada letra guarda un **hechizo escondido** que se activa con un tipo de gesto y **encanta** la letra: la transforma de una forma deliciosa usando solo sus propios trazos. Cuando las seis han despertado, convergen, hay un silencio, la palabra se lee entera y las astas crecen hasta formar un castillo.
- **Efecto buscado en quien juega:** **alegría y calidez**. Que sonría, que se sienta bienvenido y que quiera compartirlo con quien tiene al lado (público familiar e intergeneracional). El asombro sigue siendo el medio, no el fin.

## 2. Restricciones del encargo (no negociables)

1. Los elementos gráficos que construyen el significado deben **provenir de las letras**. Nada de formas externas que carguen el significado. **No se muestra el video de la cámara**: la mano es solo un punto de luz.
2. Debe **funcionar en tiempo real en la web**.
3. **Jugable = explorar y descubrir.** Sin puntuación, niveles ni condición de victoria. El castillo es un cierre, no una meta.
4. La persona debe poder jugar **antes** de que se le explique la intención. Nada en pantalla explica el juego con texto.
5. Debe poder explicarse y justificarse el modelo, sus estados y reglas, y predecirse el efecto de cambiar un parámetro.
   - **La sorpresa es para quien juega; para Valen todo es determinista.** Cada hechizo responde a una regla fija (gesto → transformación). **No usar aleatoriedad pura que decida qué pasa.** El azar solo puede decorar (ruido en el polvo, variación visual), nunca decidir el resultado.
   - **Todos los parámetros viven en un solo archivo de configuración.**

### Propiedad intelectual
- **No reproducir el logo de Disney, su caligrafía ni la silueta de su castillo.** Usamos una tipografía real y libre, y el castillo es uno genérico de cuento que **se construye con las formas de las letras** (astas como torres, terminales como agujas y banderines).
- Del moodboard se toma solo el **lenguaje visual** (luz, puntos, línea fina, paleta), nunca siluetas de personajes ni composiciones concretas.
- **Castillo genérico.** Debe leerse como "castillo de cuento" y no como el de Disney: sin torre central alta y simétrica con aguja, sin techos cónicos en abanico, **sin estela de polvo en arco** sobre él (es parte del logo) y sin círculos de Mickey. Se construye con las astas y terminales de las letras de DISNEY, con torres de alturas distintas, composición asimétrica, banderines y agujas que nacen de los remates, y polvo de luz disperso (no en arco).

## 3. Dirección visual

- Pantalla casi negra (negro / azul noche). La oscuridad es el lienzo: lo que existe es lo que la luz toca, y la luz es cálida.
- Todo es luz: puntos brillantes y contorno de línea fina sin relleno. Volumen por densidad de puntos, forma por la línea.
- Trazos largos y curvos al moverse; que fluya, no que vaya en línea recta.
- Paleta cálida: **rosa suave** y **ámbar** durante la magia, **dorado** cuando una letra queda despierta, sobre azul noche.
- Brillo con `THREE.AdditiveBlending` (y, si hace falta, bloom con `UnrealBloomPass`).
- Lo que produce alegría, a tener presente al diseñar cada momento: movimiento ligero y juguetón (nada brusco ni amenazante), calidez de color, respuestas generosas (un gesto pequeño, una celebración grande), ritmo que respira y un **breve silencio antes de la revelación**.

## 4. Modelo del sistema

### Punto de atención (entrada unificada)
`input.js` entrega siempre lo mismo, venga del mouse o de la mano, para que el resto del sistema no sepa de dónde viene:

```
{ x, y, vx, vy, grab, source: 'mouse' | 'hand', active }
```

- **Mouse:** posición del cursor; `grab` = click sostenido.
- **Mano (pendiente; librería por decidir entre MediaPipe Hands directo y ml5 HandPose):** punta del índice como punto; `grab` = pellizco (distancia pulgar–índice por debajo de un umbral).
- Conviven: si la mano está presente, manda la mano; si no, el mouse.
- La mano necesita **suavizado** (los landmarks tiemblan y la velocidad es parte de la mecánica; un filtro tipo lerp o One Euro), **espejo** en el eje x y un punto de luz como única representación visual.

### Reconocimiento de gestos
Se evalúa la **trayectoria de la última ventana de tiempo** (~1 s) del punto de atención. Todo determinista y con tolerancias en `config.js`.

| Gesto | Cómo se reconoce |
|---|---|
| Círculo | ángulo acumulado alrededor del centro de la trayectoria ≥ ~300° con radio razonablemente constante |
| Subir | desplazamiento vertical hacia arriba dominante, recorrido mínimo, poca desviación lateral |
| Barrido horizontal | desplazamiento horizontal dominante y recorrido mínimo |
| Zigzag | al menos N cambios de signo de la velocidad horizontal con amplitud mínima |
| Quedarse quieto | velocidad por debajo de un umbral durante T segundos |
| Agarrar y soltar | `grab` pasa de verdadero a falso (mantenido un tiempo mínimo antes de soltar) |

Tener un **panel de depuración** (solo desarrollo, tecla `D`) que muestre la trayectoria, el gesto candidato y sus métricas, para ajustar tolerancias.

### Estados de cada letra
| Estado | Qué ocurre |
|---|---|
| Latente | invisible; solo polvo tenue en su zona |
| Sensible | el punto de atención está cerca: el polvo de esa letra se **estremece** ("aquí hay algo") |
| Escuchando | gesto parcial o equivocado: la letra se **entreabre** un instante y se apaga |
| Encantada (`conjured` en el código) | gesto correcto: el hechizo se ejecuta |
| Despierta | terminado el hechizo, queda encendida en dorado, respirando |

### Las letras
Cada letra empieza en un lugar y tamaño **distintos** de la oscuridad (no en línea). La posición final de la palabra es otra y se usa en la convergencia.

## 5. Los seis hechizos

Todo sale de los trazos de la letra (contorno de la tipografía + puntos muestreados). Las filas de D, I y S son las más importantes; todas se prototipan.

| Letra | Gesto | Qué pasa | De dónde sale |
|---|---|---|---|
| **D** | círculo | **Portal.** La panza se abre y su contorno se repite hacia el fondo, cada vez más pequeño y girando, como un túnel de luz | copias escaladas y rotadas de su propio contorno |
| **I** | subir | **Gravedad invertida.** El asta se estira hacia arriba y suelta polvo de luz que asciende en lugar de caer | puntos muestreados del asta |
| **S** | barrido horizontal | **Cinta.** La S se desenrolla y nada por la pantalla siguiendo la trayectoria | su curva convertida en estela |
| **N** | zigzag | **Relámpago.** La diagonal se vuelve una descarga que salta entre las dos astas | su diagonal con ruido |
| **E** | quedarse quieto | **Faro.** Los tres brazos se alargan y barren la oscuridad como rayos | sus brazos, extendidos |
| **Y** | agarrar y soltar | **Constelación-árbol.** La bifurcación se repite recursivamente y florece | sus propios trazos, reducidos y repetidos |

Estos efectos dependen de la tipografía elegida; ajustar tras decidirla.

### Encadenamientos (los hechizos se afectan entre sí)
- La cinta de la S, si pasa por el portal de la D, es absorbida y sale girando en espiral por el túnel.
- Si la cinta cruza la columna de la I, sube con ella.
- Una chispa del relámpago de la N enciende los brazos de la E.

Los encadenamientos también son reglas deterministas (condición de contacto → efecto).

### Final
1. Cuando las seis letras están despiertas, **convergen volando** hacia su lugar en la palabra.
2. **Silencio:** un instante de quietud donde la palabra se lee entera.
3. **Revelación:** las astas crecen, torres y agujas se dibujan detrás con línea fina y puntos, y la palabra queda al frente.
4. **Reposo:** todo respira. Tras un tiempo sin interacción, el castillo se apaga y todo vuelve a la oscuridad para el siguiente visitante.

## 6. Parámetros (todos en `src/config.js`)

Cada uno debe poder ajustarse con efecto predecible; esto sustenta el criterio de "comprensión y verificación".

- **Gestos:** ventana de tiempo, ángulo mínimo del círculo, recorrido mínimo de subir y barrido, cambios de signo mínimos del zigzag, umbral de quietud y su duración, umbral de pellizco.
- **Sensibilidad:** radio de "sensible", duración del estado "escuchando".
- **Mano:** factor de suavizado, umbral de confianza de la detección.
- **Hechizos:** duración de cada uno, cantidad de copias del portal, velocidad de ascenso del polvo de la I, longitud de la cinta, ramas y profundidad de la constelación.
- **Final:** duración de la convergencia, del silencio y de la revelación; tiempo de inactividad antes de reiniciar.
- **Visual:** cantidad de partículas, colores por estado, intensidad del brillo.

Para la bitácora, cada cambio de parámetro se registra como **hipótesis antes, observación después**.

## 7. Stack y estructura del repo

- **Vite** (vanilla JS, módulos ES) + **three.js** (npm; render 2D con cámara ortográfica, partículas y líneas con `AdditiveBlending`) + **opentype.js** (contornos y muestreo de la tipografía) + una librería de detección de mano **por decidir** (entrada por mano pospuesta; hoy solo mouse).
- **Cuando se retome la mano:** verificar la API vigente de la librería elegida en su documentación; cambia entre versiones. MediaPipe Hands directo es más liviano que ml5 (que arrastra TensorFlow.js y un postinstall con `patch-package`).
- Tipografía **local** en `public/fonts/` con licencia libre (OFL). **Aún sin elegir.** Candidatas: Cormorant Garamond, Cinzel, Playfair Display. Probar "DISNEY" en mayúsculas con cada una y mirar si astas y remates se prestan a convertirse en torres.
- La cámara exige **HTTPS** (GitHub Pages lo cumple; en local, `localhost` también). No se guarda ni se transmite nada de la cámara.
- Debe poder desplegarse en **GitHub Pages**.

```
/
├── AGENT.md
├── README.md
├── package.json
├── vite.config.js
├── index.html
├── public/
│   └── fonts/
├── src/
│   ├── main.js            # arranque, escena y ciclo de three.js
│   ├── config.js          # TODOS los parámetros
│   ├── font.js            # fuente, contornos, muestreo de puntos
│   ├── input.js           # entrada unificada (mouse + mano)
│   ├── hand.js            # (pendiente) detección de mano, suavizado, espejo, pellizco
│   ├── gestures.js        # reconocimiento de gestos por trayectoria
│   ├── letter.js          # letra: estados y transiciones
│   ├── spells/            # un archivo por hechizo (d.js, i.js, s.js, n.js, e.js, y.js)
│   ├── chains.js          # encadenamientos entre hechizos
│   ├── finale.js          # convergencia, silencio, castillo, reposo
│   ├── dust.js            # polvo ambiental
│   └── render.js          # brillo, estelas, colores
└── docs/
    ├── bitacora/
    └── referentes.md      # moodboard, Word as Image, Playables
```

Es una propuesta: si algo se ve mejor distinto, proponlo y explica por qué antes de cambiarlo.

## 8. Plan de trabajo (por hitos, uno a la vez)

Valen quiere **prototipar las seis letras**. Primero toda la tubería (entrada, gestos, estados) y luego los seis hechizos a nivel de prototipo, para pulir después con el resto del tiempo. Trabaja **un hito por vez**, deja que Valen lo pruebe en el navegador y espera su visto bueno. Un commit por hito.

1. **Repo y esqueleto:** `git init`, Vite + three.js + opentype.js, `.gitignore`, README básico, canvas oscuro a pantalla completa, estructura de carpetas, `config.js` con la lista de parámetros.
2. **Tipografía y muestreo:** cargar una fuente provisional, extraer contornos de las seis letras y muestrear puntos. Modo de depuración que dibuja contornos y puntos.
3. **Punto de luz con mouse:** entrada unificada (`input.js`), punto con estela, polvo ambiental casi invisible.
4. **Reconocedor de gestos:** los seis gestos sobre la trayectoria, con panel de depuración. Verificar cada uno con el mouse antes de seguir.
5. **Entrada por mano:** HandPose con suavizado, espejo y pellizco, alimentando el mismo `input.js`. Verificar que los gestos funcionan igual que con mouse y ajustar tolerancias.
6. **Ciclo de letra:** seis letras en posiciones y tamaños distintos con los estados latente, sensible, escuchando, conjurada y despierta. El hechizo es un placeholder (encendido dorado con destello) para que todo el flujo funcione de punta a punta.
7. **Hechizos, uno por uno, en este orden:** D (portal), I (gravedad invertida), S (cinta), N (relámpago), E (faro), Y (constelación-árbol). Prototipo de cada uno, probado antes del siguiente.
8. **Encadenamientos** entre hechizos.
9. **Final:** convergencia, silencio, castillo desde las letras, reposo y reinicio.
10. **Pulido y pruebas con otras personas:** ritmo, momentos de lectura, rendimiento, iluminación de la sala con la cámara, despliegue en GitHub Pages.

## 9. Decisiones abiertas (pregúntale a Valen, no asumas)

- **Tipografía final** (los hechizos se ajustan a sus formas).
- **Destellos de cuatro puntas:** el encargo pide que los elementos gráficos salgan de las letras. Opciones: (a) formarlos con trazos de la propia letra, (b) dibujarlos como elemento externo y registrarlo en la bitácora como decisión consciente.
- Tamaño y relación de aspecto de la pantalla del evento.
- Sonido: hay un loop de fondo (archivo que pone Valen; ver `public/audio/`). Debería sonar cálido y alegre, no solemne.

## 10. Cómo trabajar con Valen

- Valen está en 6.º semestre de Ingeniería en Diseño de Entretenimiento Digital (UPB) y viene de proyectos con p5.js, ml5.js y Three.js (ml5 ya no es dependencia del repo); este proyecto se hace en **three.js**. Puede seguir código, pero **tiene que poder explicarlo**: comenta el *porqué* de cada regla, no solo el qué.
- Código simple y legible antes que ingenioso. Funciones pequeñas con nombres que reflejen el modelo (`conjure`, `awaken`, `listen`, `converge`).
- Cada regla del sistema debe localizarse en un solo lugar y ajustarse desde `config.js`.
- No agregues dependencias sin preguntar.
- Responde y comenta en español.
- Antes de un cambio grande, resume el plan en pocas líneas y espera confirmación.
- Al terminar cada hito, di qué probar en el navegador y qué parámetro mover para ver su efecto.
- Los hechizos son lo más creativo del proyecto: antes de programar uno, describe en pocas líneas cómo lo harás y espera el visto bueno de Valen.

## 11. Bitácora (obligatoria, no se califica por separado)

Valen debe registrar en su bitácora de GitHub referentes, bocetos, experimentos, decisiones y pruebas. Ayúdale a mantenerla:

- Al cerrar cada hito, propón una entrada corta en `docs/bitacora/` con fecha, qué se hizo, qué se decidió y por qué, y qué se observó.
- Para cada cambio de parámetro o de regla: **hipótesis antes, observación después**.
- Registra las pruebas con otras personas: qué intentaron, qué descubrieron, qué gestos probaron antes de dar con el correcto, cómo interpretaron las respuestas.
- Registra los cambios de concepto, cada uno con su razón:
  1. "Dar vida a lo inanimado / cuidar" -> "hacer posible lo imposible / conjurar": la primera mecánica se sentía de gestión y no mágica; se buscaba asombro.
  2. "Hacer posible lo imposible / conjurar" -> **"hacer feliz a la gente: magia y fantasía / encantar"**: lo imposible producía espectáculo y no calidez; la misión de la marca es de afecto, y el efecto buscado pasó de asombro a alegría. Se mantiene la tubería y los gestos; cambian el tono, la paleta y el sentido de los hechizos.

### Autoevaluación (lista antes de presentar)
Cada criterio de 0 a 25 puntos, con evidencias:
1. **Cumplimiento del encargo:** letras del nombre, jugable, tiempo real en la web, contexto definido.
2. **Comprensión y verificación:** explicar y justificar modelo, estados y reglas; predecir y verificar el efecto de cambiar una regla o parámetro.
3. **Interacción e identidad:** qué permiten descubrir las acciones sobre el atributo elegido, contrastado con las pruebas con otras personas.
4. **Resolución tipográfica y experiencia de juego:** composición, ritmo, momentos de lectura y respuestas perceptibles.

### Base para justificar la misión y el atributo
- **Misión (fuente primaria):** Compromiso Disney, sección Institucional (compromiso.disneylatino.com/institucional): operar el negocio de forma ética y fomentar la felicidad y el bienestar de niños y familias. Sin fecha visible (pie "© 2026"). Verificada.
- **Magia y fantasía (fuente secundaria):** Oropeza, C. (21/04/2023). *La magia detrás del branding de Disney*. We Build It. Presenta la misión como "hacer a la gente feliz en todo el mundo" y al castillo como la magia, la fantasía y el sueño de un lugar donde todos pueden ser felices. Es un blog de marca: sirve para ubicar la idea, no como respaldo académico. Verificada.
- **Pendiente de verificar:** figura de ResearchGate sobre el esquema de atributos de la marca Disney (fig1_395179938). La página devolvió 403 desde la herramienta; Valen debe abrirla y anotar título, autores y año antes de citarla.
- Que la alegría surja de **encantar** con un gesto es una decisión de diseño de Valen construida sobre esa base. Ver `docs/referentes.md`.

## 12. Presentación

Se presenta el sistema funcionando y **se invita a alguien a jugar antes de explicar la intención**. Esa persona cuenta qué intentó, qué descubrió y cómo interpretó las respuestas. Después se explica la organización, el atributo y el contexto, y cómo las decisiones tipográficas, los gestos y los hechizos permiten explorar esa identidad. Todo en el diseño debe sostener esa secuencia: sin instrucciones en pantalla, con pistas perceptibles (el polvo que se estremece, la letra que se entreabre) en lugar de texto.
