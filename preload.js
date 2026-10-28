/* TRANS-FORMA · © Bianca Mozzon (Blanca Mozzon) · puente mínimo entre las páginas y la app: solo guardar archivos */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tfNative', {
  save: (filename, bytes) => ipcRenderer.invoke('tf-save', String(filename), bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)),
  platform: process.platform,
});
