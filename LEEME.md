# TRANS-FORMA · © 2015–2026 Bianca Mozzon (Blanca Mozzon)

Herramientas que se encuadran en la tesis «TRANS-FORMA. De la superficie plana a la superficie espacial» (Maestría en Lógica y Técnica de la Forma, FADU-UBA; investigación iniciada en 2012, defendida en 2015). Versión 2.0.0. Cinco herramientas: **Cierres**, **Curva libre**, **Unión por tramos**, **Inversa** y **Uniones**. Todo se calcula en la computadora, sin internet.

## 1. Web sin internet (carpeta `docs/`)
- Abrir `index.html` con Chrome, Edge o Firefox. Arriba se elige la herramienta (Ctrl 1 · 2 · 3 · 4 · 5).
- `index.html` necesita al lado sus cinco archivos: `curva-g14.js`, `tramos-v2.js`, `inversa-clases-3.js`, `tf-puntos-7.js` y `tf-movil2.js`. No hacen falta otras dependencias.
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

Usa el motor de la versión 1.0.0, extraído sin cambios: Cierres, Uniones y Curva libre (clases A a E). Unión por tramos, Inversa y las operaciones F y G de Curva libre están solo en la web y en la app.

## 3. App de escritorio
- **Linux**: `TRANS-FORMA-2.1.0-linux-x86_64.AppImage`. Darle permiso de ejecución (clic derecho → Propiedades → Permitir ejecutar, o `chmod +x`) y abrir con doble clic.
- **Windows**: `TRANS-FORMA-2.1.0-windows-x64.zip`. Descomprimir en una carpeta (por ejemplo Documentos) y abrir `TRANS-FORMA.exe`. La primera vez Windows avisa «Windows protegió su PC» porque la app no está firmada: «Más información» → «Ejecutar de todas formas».
- Las exportaciones se guardan por defecto en Documentos/TRANS-FORMA (menú Archivo → Abrir carpeta de exportaciones).

### Instalador de Windows con ícono propio (opcional)
La carpeta `TRANS-FORMA-app-fuente.zip` trae todo para compilarlo en GitHub sin instalar nada:
1. Crear un repositorio en github.com y subir el contenido de la carpeta (incluida `.github`).
2. Pestaña **Actions** → «Compilar TRANS-FORMA» → **Run workflow**.
3. En unos 10 minutos, abajo de la corrida aparecen para descargar el instalador `.exe`, la versión portable y el AppImage.

## Exportar (pestaña «Exportar» de Cierres, Curva libre y Uniones; Unión por tramos e Inversa tienen sus propios botones)
| Botón | Archivos | Para qué |
|---|---|---|
| Volumen | `_volumen_superficie.obj`, `_volumen_solido.stl` | Rhino, Fusion, render; impresión 3D del volumen |
| Lámina plana | `_corte.svg`, `_corte.dxf`, `_lamina_plana.obj`, `_lamina_plana_solido.stl` | cortar la pieza (plotter, láser) o imprimirla acostada |
| Todo | lo anterior + `_datos.json` | un .zip con todo y las métricas |
| Imagen | `.png` | la vista 3D tal como se ve |

- Unidades: milímetros, Z hacia arriba. «1 módulo = … mm» fija la escala; «Espesor» el grosor de los STL.
- El volumen sale en el estado de la barra de transición (100 % = cerrado).
- SVG y DXF: contornos en la capa CORTE, puntos de inicio (A, B…) en INICIOS. Dos láminas salen una al lado de la otra.

## Licencia
© Bianca Mozzon (Blanca Mozzon). Licencia **PolyForm Noncommercial 1.0.0** (texto completo en `LICENSE`, en la raíz del repositorio). Gratis para investigación, docencia y fines no comerciales. **El uso comercial no está permitido** sin una licencia comercial escrita de la autora (detalle en `USO-Y-LICENCIA.md`). Quien redistribuya el código debe conservar los avisos `Required Notice` de `LICENSE`.
