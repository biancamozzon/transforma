/* TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon) · app de escritorio (Electron).
   Sirve las tres herramientas desde app://tf/ (un origen propio: el cálculo en Web Worker y el guardado local funcionan igual que en el navegador).
   Todo corre en la computadora; la app no se conecta a internet. */
'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, shell, nativeTheme, session } = require('electron');
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');

const WWW = path.join(__dirname, 'www');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

// el 3D tiene que andar también en equipos con placa de video vieja o sin aceleración: se permite el render por software
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
if (!app.requestSingleInstanceLock()) app.quit();
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 940, minWidth: 900, minHeight: 600, title: 'TRANS-FORMA', show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#121618' : '#ECEFEF',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://tf/')) e.preventDefault(); });
  win.loadURL('app://tf/index.html');
}

function menu() {
  const mac = process.platform === 'darwin';
  const send = n => () => win && win.webContents.executeJavaScript(`document.querySelectorAll('nav [data-t]')[${n}].click()`);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: 'Archivo', submenu: [{ label: 'Abrir carpeta de exportaciones', click: () => { const d = exportDir(); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); } }, { type: 'separator' }, mac ? { role: 'close', label: 'Cerrar' } : { role: 'quit', label: 'Salir' }] },
    { label: 'Editar', submenu: [{ role: 'undo', label: 'Deshacer' }, { role: 'redo', label: 'Rehacer' }, { type: 'separator' }, { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' }, { role: 'selectAll', label: 'Seleccionar todo' }] },
    { label: 'Herramienta', submenu: [{ label: 'Cierres', accelerator: 'CmdOrCtrl+1', click: send(0) }, { label: 'Uniones', accelerator: 'CmdOrCtrl+2', click: send(1) }, { label: 'Curva libre', accelerator: 'CmdOrCtrl+3', click: send(2) }] },
    { label: 'Ver', submenu: [{ role: 'reload', label: 'Recargar' }, { type: 'separator' }, { role: 'resetZoom', label: 'Tamaño real' }, { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }, { role: 'toggleDevTools', label: 'Herramientas de desarrollo' }] },
    { label: 'Ayuda', submenu: [{ label: 'Acerca de TRANS-FORMA', click: () => win && win.webContents.executeJavaScript("document.getElementById('about').click()") }] },
  ]));
}

const exportDir = () => path.join(app.getPath('documents'), 'TRANS-FORMA');

/* guardar: diálogo «Guardar como», por defecto en Documentos/TRANS-FORMA */
ipcMain.handle('tf-save', async (e, filename, bytes) => {
  const name = String(filename || 'transforma').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
  const ext = path.extname(name).slice(1).toLowerCase();
  const KIND = { zip: 'Archivo .zip', json: 'Datos JSON', png: 'Imagen PNG', obj: 'Malla OBJ', stl: 'Sólido STL', svg: 'Dibujo SVG', dxf: 'Dibujo DXF' };
  fs.mkdirSync(exportDir(), { recursive: true });
  const r = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender) || win, {
    title: 'Guardar', defaultPath: path.join(exportDir(), name), filters: ext ? [{ name: KIND[ext] || ext.toUpperCase(), extensions: [ext] }] : [] });
  if (r.canceled || !r.filePath) return { canceled: true };
  await fs.promises.writeFile(r.filePath, Buffer.from(bytes));
  return { path: r.filePath };
});

app.whenReady().then(() => {
  protocol.handle('app', req => {
    const u = new URL(req.url);
    if (u.host !== 'tf') return new Response('no encontrado', { status: 404 });
    const file = path.normalize(path.join(WWW, decodeURIComponent(u.pathname)));
    if (!file.startsWith(WWW)) return new Response('no permitido', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // sin red: cualquier pedido fuera de la app se corta (las herramientas no lo necesitan)
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(app|blob|data|file|devtools|chrome-extension):/.test(d.url) }));
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'clipboard-sanitized-write'));
  menu(); createWindow();
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
