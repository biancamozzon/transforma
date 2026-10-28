# TRANS-FORMA · Descripción técnica

**Autoría:** Bianca Mozzon (Blanca Mozzon) · © 2015–2026
**Fecha de esta descripción:** 28 de octubre de 2026
**Versión del software descrito:** 1.0.0 (Cierres v2, Curva libre v4, Uniones)

Este documento describe el método que implementa el código publicado junto con él en este repositorio. Su fecha es la de la publicación; las huellas SHA-256 del final identifican exactamente los archivos descritos.

## 1. Origen

TRANS-FORMA se encuadra en la tesis **«TRANS-FORMA. De la superficie plana a la superficie espacial»**, de la Maestría en Lógica y Técnica de la Forma (Facultad de Arquitectura, Diseño y Urbanismo, Universidad de Buenos Aires). Tesista: Bianca Mozzon. Director: Arq. Roberto Bonifacio. La portada del documento de la tesis lleva la fecha «Abril del 2015». La investigación comenzó en 2012 y la tesis fue defendida en 2015 (datos de la autora).

**Qué es de la tesis (2015)**
- El vocabulario: ELP (entidad limitante perimetral, a la que se aplica *unión*) y ELI (entidad limitante inscripta, a la que se aplica *sutura*).
- Las clases A a D (pág. 22) y las variables de inicio e interpretación (págs. 49 a 55): el punto de inicio del cierre, la dirección espacial de los vértices, el cierre total o parcial, la relación entre las dos figuras, la simetría especular entre láminas.
- El pedido de herramientas de cálculo que permitan prefigurar la superficie espacial desde la lámina plana, y de verificar si es posible formular ecuaciones (págs. 59 y 60).

**Qué es desarrollo posterior de la autora a la tesis (este repositorio)**
- La simulación numérica de los cierres y las tres herramientas: Cierres, Curva libre y Uniones.
- La operación E: dos láminas sin caladura, unidas solo por el perímetro, cada una con su propio punto de inicio.
- Los tipos de unión por costura (herrajes, cordón por ojales, superposición) y sus métricas.
- El filtro «emprolijar» de curvas dibujadas a mano.
- La exportación del volumen y de la lámina plana (OBJ, STL, SVG, DXF).

## 2. Problema y enfoque

Una lámina plana se cierra uniendo su borde consigo mismo (unión perimetral) o cosiendo una caladura interior (sutura), y pasa a ser una superficie 3D. Prever esa forma desde el plano es difícil. TRANS-FORMA es una **herramienta de prefiguración**: se dibuja la lámina, se elige cómo se cierra y se ve la forma espacial resultante, con la barra de transición de 0 % (plana) a 100 % (cerrada). No es una solución exacta del cálculo de la forma 3D.

## 3. Regla del cierre

Sea la lámina plana inextensible $\Omega \subset \mathbb{R}^2$, con borde $c(s)$ parametrizado por longitud de arco, $s \in [0, P)$, siendo $P$ el perímetro. Se busca una inmersión isométrica $f:\Omega \to \mathbb{R}^3$: no estira ni rasga.

**Un inicio (Clase A, cierre total).** El punto A está en $s_A$ y el punto B en $s_A + P/2$. Cerrar es identificar pares de puntos del borde a la misma distancia de A:

$$c(s_A + t) \equiv c(s_A - t), \qquad t \in [0,\, P/2]$$

A $t$ se lo llama **profundidad** del par. A y B se mueven juntos, de modo que los dos lados miden $P/2$ (requisito de la tesis, pág. 51: «figura a = figura b»).

**Progreso de la transición.** Con $\tau \in [0,1]$ el avance:

$$\text{par activo en } \tau \iff t \le \tau \cdot \frac{P}{2}$$

**Cierre parcial y varios inicios.**

$$c(s_{0k} + t) \equiv c(s_{0k} - t), \qquad t \in [0,\, \mathrm{ext}_k]$$

Cada inicio $k$ tiene su posición $s_{0k}$ (fracción del perímetro) y su extensión $\mathrm{ext}_k$. Con un solo inicio y $\mathrm{ext} < P/2$ queda un tramo abierto alrededor de B. Con varios inicios la profundidad de cada par se normaliza a $P/2$ para que todos terminen en el mismo fotograma.

**Sutura (Clases B, C y D).** Es la misma regla sobre el contorno de la caladura, con su propio A y su B a medio perímetro del agujero. En la Clase C la unión del borde exterior se escala en $\tau$ para terminar junto con la sutura.

**Dos láminas con caladura (Clase D).** La unión entre láminas se empareja por longitud de arco desde A, un lado hacia cada mano. Con $i$ el índice de nodo del borde:

$$\text{idéntica: } i \leftrightarrow i \qquad\qquad \text{espejo: } i \leftrightarrow -i$$

**Dos láminas sin caladura (operación E).** Cada lámina tiene su A (nodo 0 de su contorno) y su B a $P/2$. El nodo de la lámina 1 a distancia de arco $d$ (con signo) de $A_1$ se une al punto de la lámina 2 a:

$$d_2 = \pm\, d \cdot \frac{P_2}{P_1} \qquad (+ \text{ idéntica},\; - \text{ espejo})$$

interpolando entre los nodos vecinos. En espejo, la lámina 2 se da vuelta ($x \to -x$). Para el apilado inicial, la lámina 2 se gira y traslada en el plano por mínimos cuadrados (Kabsch 2D) para que cada pareja arranque lo más cerca posible:

$$(R, b) = \arg\min_{R \in SO(2),\, b} \sum_i \left\| R\, q_i + b - p_i \right\|^2$$

Si $P_2$ difiere de $P_1$ más de un 2 %, la herramienta avisa que el emparejado proporcional obliga a estirar; «sugerir curva» escala la lámina 2 por $k = P_1/P_2$ para igualar perímetros. Observación del motor: la operación E queda plana solo si las dos láminas coinciden punto a punto al apilarlas.

## 4. Geometría que gobierna el resultado

[Teoría estándar, citada; no se probó numéricamente en el motor.]

Tras el cierre, la superficie es plana en casi todo punto; la curvatura se concentra en puntos de cono y a lo largo de la costura.

**Ángulo de cono y déficit.** Con $\alpha(s)$ el ángulo interior del borde en cada punto (π en un tramo liso, el ángulo de la figura en un vértice):

$$\theta = \sum_{\text{puntos identificados}} \alpha(s), \qquad \kappa = 2\pi - \theta$$

Un punto liso unido con otro liso da $\theta = 360°$ (plano). A o B sobre un tramo liso dan un cono de 180°. Una suma mayor a 360° es una silla.

**Gauss–Bonnet** para una lámina cerrada por su borde desde A (superficie del tipo de la esfera), con $k_g$ la curvatura geodésica del borde plano:

$$\sum_{\text{conos}} \kappa_i \;+\; \int_0^{P/2} \big(k_g(s_A + t) + k_g(s_A - t)\big)\, dt \;=\; 4\pi$$

Con bordes rectos los déficits suman 720°. Con bordes curvos parte de la curvatura vive a lo largo de la costura y los dos lados no curvan igual: de ahí viene la torsión de la S de dos medias gotas.

**Alexandrov y Pogorelov.** Una superficie cerrada, plana salvo conos con $\theta \le 360°$, es la superficie de un único poliedro convexo (o de un polígono doble, de volumen cero), y la superficie convexa con esa métrica es única. Con tres conos o menos la forma es siempre plana. Cuando el material elige una forma no convexa no hay teoría cerrada: el motor da una solución y no está demostrado que sea la única.

## 5. De la curva dibujada a la malla

**Modelo de curva (Curva libre y Uniones).** Puntos de control con marca de *punta* o *suave*. Sin puntas, Catmull-Rom centrípeta periódica; con puntas, un tramo Catmull-Rom abierto entre ellas, con extremos por reflexión. La parametrización centrípeta usa:

$$t_{i+1} = t_i + \lVert p_{i+1} - p_i \rVert^{1/2}$$

El trazo a mano alzada se remuestrea, se suaviza y se reduce a puntos de control con Douglas–Peucker (tolerancia 0,02 módulos).

**Remuestreo desde A (`boundaryFromA`).** El contorno va en sentido antihorario. Se detectan las esquinas (giro mayor a 0,3 rad; ángulo interior $\alpha = \pi - \text{giro}$). Los cortes del borde son simétricos respecto de $s \to P - s$: $\{0,\ P/2,\ s_c,\ P - s_c\}$ para cada esquina $s_c$. Cada tramo entre cortes se divide en partes iguales. Consecuencia: **cada nodo del borde tiene su pareja exacta en otro nodo**, y las esquinas quedan como vértices de la malla.

**Malla.** Grilla triangular de paso $h$ dentro del contorno (filas desplazadas $h/2$), con margen libre de $0{,}6\,h$ a $0{,}85\,h$ contra el borde, triangulación de Delaunay (Bowyer–Watson), descartando triángulos cuyo baricentro cae afuera o dentro de la caladura. Tope por superficie: 1300 vértices en B y C, 520 por lámina en D.

**Emprolijar** (filtro reversible):
1. Remuestreo en $N = 400$ puntos por longitud de arco, con las puntas fijas.
2. Objetivo simétrico exacto $S$ según la simetría (con $m$ el centroide y $R$ la reflexión): giro de 180°, $S_i = \tfrac12 (c_i + 2m - c_{i+N/2})$; espejo, $S_i = \tfrac12 (c_i + R\, c_{k-i})$, con el eje por el centroide y su ángulo y el desfase $k$ elegidos por mínimos cuadrados; doble eje: giro y luego espejo.
3. Mezcla con intensidad $t \in [0,1]$: $q = c + t\,(S - c)$.
4. Carenado por difusión con puntas fijas ($1200\,t^2$ pasadas) y restitución del área con un desplazamiento parejo sobre la normal.

## 6. El motor de simulación

El motor busca, fotograma a fotograma, la posición de la malla que menos estira y menos dobla con los pares activos unidos. Es un esquema de **Projective Dynamics cuasi-estático** (Bouaziz et al. 2014).

**Energía.** Con $x$ las posiciones, $L_0$ el largo plano de cada arista, $w$ el peso de cada par y $L$ el Laplaciano cotangente de la malla plana:

$$E(x) = w_e \sum_{\text{aristas}} \lVert (x_j - x_i) - d_e \rVert^2 + w_p \sum_{\text{pares}} \lVert x_i - (1-w)\,x_j - w\,x_k \rVert^2 + w_b\, \lVert L x \rVert^2_{M^{-1}} + \varepsilon\, \lVert x - x_{\text{prev}} \rVert^2$$

| Término | Función | Valor |
|---|---|---|
| $w_e$ | No estirar: cada arista vuelve a su largo plano | 1 cartulina · 0,08 goma |
| $w_p$ | Cerrar: el nodo $i$ se pega al punto $(1-w)\,x_j + w\,x_k$ del otro lado | 200 |
| $w_b$ | No doblar de más: Laplaciano cotangente de la lámina plana | rigidez × $h^2$ (S: 0,10) |
| $\varepsilon$ | Continuidad: cada fotograma parte del anterior | $10^{-3}$ |

**Paso local.** Cada arista elige su objetivo con la dirección actual y el largo de reposo: $d_e = L_{0,e}\,(x_j - x_i)/\lVert x_j - x_i \rVert$.

**Paso global.** Un sistema lineal con la misma matriz para x, y y z:

$$\left( D^\top D + w_b K_B + w_p C^\top C + \varepsilon I \right) x = D^\top d + \varepsilon\, x_{\text{prev}}$$

Se usan 80 iteraciones por fotograma, 48 fotogramas de A a B y 6 de asentamiento al final. La matriz dispersa simétrica se ordena con Cuthill–McKee inverso (RCM) y se factoriza por Cholesky de envolvente; se refactoriza solo cuando entran pares nuevos.

**Flexión.** Para cada arista $ij$, el peso del Laplaciano cotangente es la mitad de la cotangente del ángulo opuesto en cada triángulo vecino; $M$ es el área de Voronoi baricéntrica. Solo se aplica a filas interiores: el borde queda libre para cerrar. En goma con espesor $t$, la flexión escala con $(t/0{,}03)^2$.

**Salida del plano.** La lámina arranca con un abovedado mínimo $z = h\,(1 - r^2/r_{\max}^2)$; en D y E las dos láminas se abren como almohada. La altura de A y B se controla con un tirón suave (peso 5) del $z$ de esos puntos. El modo poliédrico para papel proyecta, cada ocho iteraciones, los vértices hundidos sobre la envolvente convexa.

**Aceleración de Chebyshev** (Wang 2015), solo con uniones no triviales:

$$q \leftarrow \omega \left( \gamma (\hat q - q_k) + q_k - q_{k-1} \right) + q_{k-1}, \qquad \omega_2 = \frac{2}{2-\rho^2},\quad \omega_{k+1} = \frac{4}{4 - \rho^2 \omega_k}$$

con $\rho = 0{,}98$, $\gamma = 0{,}9$ y 8 iteraciones de espera.

## 7. Uniones por costura (herramienta Uniones)

Cambia **cómo** se ata cada par de la cremallera, sin cambiar **qué** se empareja. Cada atadura es una combinación lineal de nodos que debe valer un objetivo:

$$\sum_m c_m\, x_m = \text{objetivo}, \qquad \text{cremallera: } x_i - (1-w)\,x_j - w\,x_k = 0$$

Las ataduras bilaterales entran a la matriz como un par común. Las unilaterales (cordón y contacto) usan conjunto activo: entran solo mientras tiran o tocan, y se revisan cada 8 iteraciones.

Cada costura combina un **trazado** (continuo o por puntos) con un **encuentro** (tope, cordón o solape):

| Tipo | Formulación |
|---|---|
| Cremallera | Todos los pares atados borde contra borde (la de la tesis) |
| Herrajes por puntos | Solo se atan los pares con $\lvert t - m\cdot\text{paso}\rvert \le \max(\text{dia}/2,\ h/2)$, $m \ge 1$ |
| Cordón por ojales | Ojales a una distancia «margen» hacia adentro de cada borde; un cordón en zigzag $E1_1 \to E2_1 \to E1_2 \to \dots$; cada tramo tira pero no empuja |
| Superposición continua | Un borde se ata a la franja del otro a un ancho $w$ hacia adentro |
| Superposición con broches | Igual, solo en los parches de cada broche |

**Cordón.** Largo de reposo con los bordes a separación $g$ y ojales a margen $e$: cruce $g + 2e$; diagonal $\sqrt{(g+2e)^2 + (t_{q+1} - t_q)^2}$. Entre dos láminas apiladas (D, E) el cruce es $g$. Un cordón deslizante, con una sola restricción sobre la suma de largos, se probó y se descartó: el resultado dependía del camino y no convergía.

**Superposición en una lámina.** El solape arranca en punta en A y en B, donde los dos bordes son el mismo punto:

$$w(t) = w_{\max} \cdot \min\!\left(1,\; \frac{t}{L},\; \frac{t_{\text{fin}} - t}{L}\right), \qquad L = 2\,w_{\max}$$

Entre dos láminas es una pestaña cara a cara (como un termosellado). Si las capas están pegadas, la franja doble flexiona como una lámina de espesor $2t$ (inercia $\propto (2t)^3 = 8t^3$); cada nodo de la franja recibe ×4 en su fila de flexión. Si están apoyadas, deslizan ($2t^3$) y no se agrega nada.

**Contacto.** Donde la costura no queda atada, un borde no puede entrar en el material del otro: se mide la penetración sobre la normal y, si es positiva, se proyecta el borde sobre el tope.

**Métricas propias:** abertura máxima y media entre bordes (en unidades de $h$), tramos de cordón totales y tensos con su error de largo, y separación máxima entre capas del solape.

## 8. Exportación

Todo en milímetros, con Z hacia arriba; «1 módulo = … mm» fija la escala y «espesor» el grosor de los sólidos.

| Salida | Contenido |
|---|---|
| Volumen | OBJ de la superficie media y STL binario del sólido con espesor, en el estado de la barra de transición |
| Lámina plana | SVG y DXF (R12) de corte, con los contornos en la capa CORTE y los puntos de inicio A y B en la capa INICIOS; OBJ y STL de la lámina acostada (extruida el espesor elegido). Dos láminas salen una al lado de la otra |
| Datos | JSON con parámetros y métricas |
| Imagen | PNG de la vista 3D |

## 9. Formas de uso

- **Navegador:** tres páginas independientes (`docs/cierres.html`, `docs/uniones.html`, `docs/curva-libre.html`) y un `index.html` que las reúne en pestañas. Sin conexión: three.js r128 y las tipografías van incrustados.
- **App de escritorio (Windows y Linux):** una ventana con las tres herramientas (Electron).
- **Terminal (Node.js 18 o más nuevo):** `node transforma.js verificar | figuras | calcular <figura o .json>`. Usa los mismos módulos del motor, extraídos sin cambios.

## 10. Verificación

Cada cálculo se juzga con el estiramiento de aristas (medio, p95 y pico), el hueco del cierre y el tiempo de cálculo.

$$\text{estiramiento}_e = \frac{\big|\, \lVert x_b - x_a \rVert - L_{0,e} \big|}{L_{0,e}}, \qquad \text{hueco} = \frac{\max_{\text{pares}} \lVert x_i - (1-w)x_j - w x_k \rVert}{h}$$

Criterio de uso: estiramiento medio menor a 1 % en cartulina, hueco menor a 0,02 $h$, tiempo menor a 10 s.

**Figura de control: la S de dos medias gotas** (cartulina, rigidez 0,10, 52 divisiones, 48 fotogramas). Mismos resultados en las tres herramientas, en la web sin internet, en la app y en la terminal (medido el 28 de octubre de 2026, navegador sin cabeza y Electron bajo Linux):

| Medida | Valor |
|---|---|
| Vértices · triángulos | 863 · 1620 |
| Estiramiento medio · p95 · pico | 0,78 % · 2,38 % · 23,4 % |
| Hueco del cierre | 0,0005 $h$ |
| Tiempo de cálculo | 2,6 a 3,9 s en la web y en la terminal; en la app, entre 3,1 y 3,4 s en una corrida y hasta 8,6 s en otra con carga simultánea |

Otros resultados medidos (24 de octubre de 2026, cartulina salvo indicación): Curva libre en clase A con inicio en 30 %, 0,62 %; B, 0,47 %; C, 1,21 %; D en espejo, 1,37 %; D en goma, 3,9 %. Operación E: copia idéntica con A₂ = A₁, 0,00 % y plana; copia en espejo con figura a mano, 0,38 %.

## 11. Límites conocidos

- **No hay maquetas físicas** contra las que se haya contrastado cada clase; la S de dos medias gotas coincide con la maqueta de la tesis por comparación visual. No hay maquetas para la operación E ni para casos no convexos.
- No hay detección de colisiones: una lámina puede atravesarse a sí misma o a la otra (Clase D).
- El espesor no impide pliegues más filosos que el material. En cartulina el cálculo puede encontrar mínimos locales.
- Las operaciones combinadas (C y D) estiran más de 1 % en cartulina porque las dos uniones sobrerrestringen la malla (anillo con S y unión del borde: 1,51 %; dos anillos: 2,09 %).
- Curva libre y Uniones admiten una sola caladura y dos inicios (A y B). En la Clase D la caladura es obligatoria.
- La rigidez y la goma son valores relativos, no calibrados con ensayos de materiales.
- La apertura de los archivos exportados en programas externos (Rhino, Fusion, laminadores) y el uso en pantallas táctiles no están verificados.
- La clasificación en clases de algunas figuras de la herramienta Cierres está en revisión respecto de la tesis.

## 12. Antecedentes y teoría citados

Se describe el método tal como está implementado, sin pretensión de exclusividad sobre los resultados y métodos estándar que se citan.

- Demaine, E. D. y Price, A. 2009, «Generalization of D-forms and pita-forms», arXiv:0711.2605 (leído): D-forms y pita-forms de piezas convexas de borde suave. Los D-forms (Wills, c. 2000) unen dos láminas planas de igual perímetro por el borde; la operación E coincide con esa idea, y se atribuye como extensión.
- Alexandrov, A. D., *Convex Polyhedra* (1950); Pogorelov (unicidad de superficies convexas).
- Gauss–Bonnet para superficies con conos y curvatura geodésica de borde.
- Bouaziz et al. 2014, Projective Dynamics; Wang 2015, aceleración de Chebyshev para Projective Dynamics.
- Laplaciano cotangente (Pinkall y Polthier 1993; Meyer et al. 2003); triangulación de Bowyer–Watson (1981); Cuthill–McKee inverso; Catmull-Rom centrípeta; Douglas–Peucker.
- Castle et al. 2014 (cierre de cortes rectos) y Huang, Jiang, Wills y Yang 2023 (modelado hacia adelante y hacia atrás de D-forms) se conocen solo por su resumen.

## 13. Archivos descritos y huellas SHA-256

Huellas de los archivos publicados el 28 de octubre de 2026 (versión 1.0.0), calculadas sobre el contenido del repositorio sin este documento:

```
078de96cd8e86f70ecb005fb84caef2f37497ac2a603087b09b29a00c4afce00  .github/workflows/compilar.yml
dae554f729f68c387f59080e61f133d46a9c7056ba5bae50a47857cf2525016f  CITATION.cff
a26523f6d9dca15716192077571d2d1e325e88616c442afe0ddd1d28a41543f1  LEEME.md
6cff12358b830f333785e31cf81e73e71a1590d7ca3475a810c537d9b0c58a81  README.md
1e642b553bddf7f4121af9e2f2a0376525c0b23b664feed721aaeecde53904c5  build/icon.png
b5aad211ba6c3fca641030e900abefde8d753c134cd4393c6c74df23f237cc70  build/icon.svg
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  docs/.nojekyll
6e161ecc35f4487338d21cf9ba4f14d38ed6151e6d4aec8adaa2ce3d160f89ab  docs/cierres.html
d8dec0d44294cd85788e506506f9ca805d170d9455a526717544272494c34648  docs/curva-libre.html
07098e764dee13452840800b5d5223dbc427004b82301cd9bebf52fd9f73399f  docs/index.html
dcb24993cb3784fae47560f719484fb553a3328a9f3576dd9e73c23d0604b052  docs/uniones.html
2b22d1422a9c81e097b8557aad4c2a59b5e351833209e67019b84a1b2d4449c5  main.js
ee21c82e4c050a0308fecad9a1eb3279765a00034d1da6b807d4d5d370593008  package-lock.json
1486eb17fe741961024941ea6448bb3ce5a862c8edcd72990e4bc4bad4bf2bb8  package.json
43c6e9f8a43e935a4f8518bb2bbf71f3b02db101680d39b92ad818448c431fb4  preload.js
a26523f6d9dca15716192077571d2d1e325e88616c442afe0ddd1d28a41543f1  terminal/LEEME.md
3758dcd3d8bf09305a819e42309f4330fe8642ba27ba01d5e7f47a3fe41b3bc6  terminal/lib/cierres/core.js
231ea9ff9e4c783ed3239641f8e6420fb2df23c9fc6076e2c0737ac5461c478b  terminal/lib/cierres/figuras.js
e22b665cbf869f182381de9cdf9b07456de957104252a0cb318b7779c695e68c  terminal/lib/curva/core_curva.js
981d4208a8607bc3f48e602dcaf757c9f3c292a61145d2339626d8d0ff8d2078  terminal/lib/curva/curve.js
2b166460c08948e035143a1876ad30d52c49558b5bae3a827f59bb3aef80088f  terminal/lib/curva/prep.js
816dffcd275b7e2e59ef667960e92c182546df5beccfc70499dbd06f00d3c9e1  terminal/lib/tf-geom.js
fe58484b24523db0e9a67f457216eae0352c1648123f50216de1e2567d9e2ccb  terminal/lib/uniones/core_curva.js
c8d5b31ea349ca90705afcece1cd081cfe3f3fea15dfff34e4af2476078ea9bf  terminal/lib/uniones/curve.js
2b166460c08948e035143a1876ad30d52c49558b5bae3a827f59bb3aef80088f  terminal/lib/uniones/prep.js
ef657d9e61227aa10d2a49400687c912e43e132d620ebca7a4a479026081cfe0  terminal/transforma.js
6e161ecc35f4487338d21cf9ba4f14d38ed6151e6d4aec8adaa2ce3d160f89ab  www/cierres.html
d8dec0d44294cd85788e506506f9ca805d170d9455a526717544272494c34648  www/curva-libre.html
07098e764dee13452840800b5d5223dbc427004b82301cd9bebf52fd9f73399f  www/index.html
dcb24993cb3784fae47560f719484fb553a3328a9f3576dd9e73c23d0604b052  www/uniones.html
```

