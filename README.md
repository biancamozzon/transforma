# TRANS-FORMA

**De la superficie plana a la superficie espacial.** Simulación de cómo una lámina plana se cierra —uniendo su borde (unión perimetral) o cosiendo una caladura interior (sutura)— y pasa a ser una superficie 3D.

© 2015–2026 Bianca Mozzon (Blanca Mozzon)

## Origen y autoría
Este repositorio reúne las herramientas digitales que se encuadran en la tesis **«TRANS-FORMA. De la superficie plana a la superficie espacial»**, de la **Maestría en Lógica y Técnica de la Forma** (Facultad de Arquitectura, Diseño y Urbanismo, Universidad de Buenos Aires). La investigación comenzó en 2012 y la tesis fue defendida en 2015. Tesista: Bianca Mozzon. Director: Arq. Roberto Bonifacio.

Las clases A a D y las observaciones de las páginas 49 a 55 son de la tesis. Las operaciones posteriores (dos láminas sin caladura, tipos de unión por costura) y las herramientas de cálculo y exportación son desarrollo posterior de la autora.

## Tres herramientas
- **Cierres**: las figuras de la tesis (clases A a D).
- **Uniones**: cómo se ata cada costura (cremallera, herrajes, cordón por ojales, superposición).
- **Curva libre**: dibujás tu propia lámina y la cierra.

Todas exportan **volumen** (OBJ y STL, con espesor) y **lámina plana** (SVG y DXF de corte, OBJ y STL), en milímetros.

## Cómo usarla
- **En el navegador**: Settings → Pages publica la carpeta `docs/`. Abrí `index.html`. Funciona también sin internet si te bajás la carpeta.
- **App de escritorio (Windows y Linux)**: pestaña **Actions → Compilar TRANS-FORMA → Run workflow**; el instalador y el AppImage quedan en «Artifacts» de esa corrida.
- **Terminal**: carpeta `terminal/` (necesita Node.js 18 o más nuevo). `node transforma.js verificar`, `node transforma.js calcular S`.

Detalle de cada forma de uso, formatos de exportación y avisos de Windows en [LEEME.md](LEEME.md).

## Descripción técnica
El método (regla del cierre, geometría, motor de simulación, uniones, exportación, verificación y límites) está descrito, con fecha y huellas SHA-256 de los archivos publicados, en [DESCRIPCION-TECNICA.md](DESCRIPCION-TECNICA.md).

## Estado
Es una herramienta de **prefiguración**: simula la forma que tomaría la lámina; no resuelve el cálculo exacto de la forma 3D. La figura de control es la S de dos medias gotas. Todavía no está contrastada con maquetas físicas en todas las clases.

## Cómo citar
Ver `CITATION.cff` (GitHub lo muestra en «Cite this repository»).

## Derechos
Sin licencia de uso: todos los derechos reservados. Se puede ver y usar la herramienta, pero no copiar, modificar ni redistribuir el código sin permiso de la autora.
