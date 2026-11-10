# TRANS-FORMA

**De la superficie plana a la superficie espacial.** Simulación de cómo una lámina plana se cierra —uniendo su borde (unión perimetral) o cosiendo una caladura interior (sutura)— y pasa a ser una superficie 3D, y del camino inverso: del volumen a la lámina plana.

© 2015–2026 Bianca Mozzon (Blanca Mozzon) · versión 2.1.0 · licencia PolyForm Noncommercial 1.0.0: uso gratuito para investigación, docencia y fines no comerciales; **el uso comercial requiere una licencia aparte** ([USO-Y-LICENCIA.md](USO-Y-LICENCIA.md)).

## Origen y autoría
Este repositorio reúne las herramientas digitales que se encuadran en la tesis **«TRANS-FORMA. De la superficie plana a la superficie espacial»**, de la **Maestría en Lógica y Técnica de la Forma** (Facultad de Arquitectura, Diseño y Urbanismo, Universidad de Buenos Aires). La investigación comenzó en 2012 y la tesis fue defendida en 2015. Tesista: Bianca Mozzon. Director: Arq. Roberto Bonifacio.

Las clases A a D y las observaciones de las páginas 49 a 55 son de la tesis. Las operaciones E, F y G, la unión por tramos, la inversa y las herramientas de cálculo y exportación son desarrollo posterior de la autora.

## Cinco herramientas (categorías de generación)
1. **Cierres**: las figuras de la tesis por clase (A, B, C, D) y la S de control.
2. **Curva libre**: dibujar la lámina y pasarla a 3D, clases A a G.
3. **Unión por tramos**: unir dos tramos del borde, como una cremallera de campera, en 1 a 3 láminas.
4. **Inversa**: del volumen a la lámina plana, en volumen completo o en una zona de un volumen.
5. **Uniones**: cómo se une cada costura (cremallera, herrajes, cordón, solape).

En Cierres, Curva libre y Unión por tramos, los puntos A, B, C y D se mueven directamente sobre el volumen.

## Cómo usarla
- **En el navegador**: <https://biancamozzon.github.io/transforma/> (carpeta `docs/`). Funciona también sin internet: se baja la carpeta `docs/` y se abre `index.html`. Atajos: Ctrl 1 a 5.
- **App de escritorio (Windows y Linux)**: pestaña **Actions → Compilar TRANS-FORMA → Run workflow**; el instalador y el AppImage quedan en «Artifacts» de esa corrida.
- **Terminal**: carpeta `terminal/` (necesita Node.js 18 o más nuevo): `node transforma.js verificar`, `node transforma.js calcular S`. La terminal calcula Cierres, Uniones y Curva libre (clases A a E) con el motor de la versión 1.0.0. Unión por tramos, Inversa y las operaciones F y G están solo en la web y en la app.

Detalle de cada forma de uso y de los formatos de exportación en [LEEME.md](LEEME.md).

## Descripción técnica
El método (regla del cierre, geometría, motor de simulación, uniones, exportación, verificación y límites) está descrito, con fecha y huellas SHA-256 de los archivos publicados, en [DESCRIPCION-TECNICA.md](DESCRIPCION-TECNICA.md).

## Estado
Es una herramienta de **prefiguración**: simula la forma que tomaría la lámina; no resuelve el cálculo exacto de la forma 3D. La figura de control es la S de dos medias gotas. Todavía no está contrastada con maquetas físicas en todas las clases.

## Cómo citar
Ver `CITATION.cff` (GitHub lo muestra en «Cite this repository»).

## Licencia y derechos
© 2015–2026 Bianca Mozzon (Blanca Mozzon). Licencia **PolyForm Noncommercial 1.0.0**; vale el texto completo de [LICENSE](LICENSE). Resumen sin valor legal (detalle en [USO-Y-LICENCIA.md](USO-Y-LICENCIA.md)):
- **Gratis para investigación, estudio, docencia** y organizaciones sin fines de lucro, instituciones educativas o públicas, según define la licencia.
- **Copiar, modificar y redistribuir** se permite con esos fines, conservando los avisos `Required Notice` (con el nombre de la autora) y el texto o la dirección de la licencia.
- **Uso comercial** (empresas, estudios, productos o servicios con fin de lucro, incluso uso interno): **no está permitido** sin una licencia comercial escrita de la autora. Contacto: <https://github.com/biancamozzon>.
- Es una licencia de código disponible, no «código abierto» en el sentido estricto de la OSI.
