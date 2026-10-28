# TRANS-FORMA · © 2015–2026 Bianca Mozzon (Blanca Mozzon)

Herramientas que se encuadran en la tesis «TRANS-FORMA. De la superficie plana a la superficie espacial» (Maestría en Lógica y Técnica de la Forma, FADU-UBA; investigación iniciada en 2012, defendida en 2015). Tres herramientas: **Cierres**, **Uniones** y **Curva libre**. Todo se calcula en la computadora, sin internet.

## 1. Web sin internet (`TRANS-FORMA-web.zip`)
- Descomprimir y abrir `index.html` con Chrome, Edge o Firefox. Arriba se elige la herramienta (Ctrl 1 · 2 · 3).
- Cada herramienta también funciona sola: `cierres.html`, `uniones.html`, `curva-libre.html` (un archivo cada una, sin dependencias).
- Las figuras guardadas quedan en ese navegador. Para pasarlas a otro equipo: Archivos → Exportar curva (.json).

## 2. Terminal (`TRANS-FORMA-terminal.zip`)
Requiere Node.js 18 o más nuevo (nodejs.org). En la carpeta descomprimida:

```
node transforma.js verificar                 # corre la S de control y la compara con la referencia
node transforma.js figuras                   # lista las figuras de la tesis que se calculan por nombre
node transforma.js calcular S                # calcula y guarda volumen + lámina plana + datos
node transforma.js calcular G --mm 20 --espesor 1.2
node transforma.js calcular mi_curva.json    # un .json exportado desde Curva libre o Uniones
node transforma.js ayuda                     # todas las opciones
```

Usa el mismo motor que las páginas, extraído sin cambios.

## 3. App de escritorio
- **Linux**: `TRANS-FORMA-1.0.0-linux-x86_64.AppImage`. Darle permiso de ejecución (clic derecho → Propiedades → Permitir ejecutar, o `chmod +x`) y abrir con doble clic.
- **Windows**: `TRANS-FORMA-1.0.0-windows-x64.zip`. Descomprimir en una carpeta (por ejemplo Documentos) y abrir `TRANS-FORMA.exe`. La primera vez Windows avisa «Windows protegió su PC» porque la app no está firmada: «Más información» → «Ejecutar de todas formas».
- Las exportaciones se guardan por defecto en Documentos/TRANS-FORMA (menú Archivo → Abrir carpeta de exportaciones).

### Instalador de Windows con ícono propio (opcional)
La carpeta `TRANS-FORMA-app-fuente.zip` trae todo para compilarlo en GitHub sin instalar nada:
1. Crear un repositorio en github.com y subir el contenido de la carpeta (incluida `.github`).
2. Pestaña **Actions** → «Compilar TRANS-FORMA» → **Run workflow**.
3. En unos 10 minutos, abajo de la corrida aparecen para descargar el instalador `.exe`, la versión portable y el AppImage.

## Exportar (pestaña «Exportar» de cada herramienta)
| Botón | Archivos | Para qué |
|---|---|---|
| Volumen | `_volumen_superficie.obj`, `_volumen_solido.stl` | Rhino, Fusion, render; impresión 3D del volumen |
| Lámina plana | `_corte.svg`, `_corte.dxf`, `_lamina_plana.obj`, `_lamina_plana_solido.stl` | cortar la pieza (plotter, láser) o imprimirla acostada |
| Todo | lo anterior + `_datos.json` | un .zip con todo y las métricas |
| Imagen | `.png` | la vista 3D tal como se ve |

- Unidades: milímetros, Z hacia arriba. «1 módulo = … mm» fija la escala; «Espesor» el grosor de los STL.
- El volumen sale en el estado de la barra de transición (100 % = cerrado).
- SVG y DXF: contornos en la capa CORTE, puntos de inicio (A, B…) en INICIOS. Dos láminas salen una al lado de la otra.
