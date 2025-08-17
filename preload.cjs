// preload.cjs
// Run with contextIsolation: true and nodeIntegration: false
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  /** Print an A4 invoice to Canon (expects a data: URL of HTML) */
  printCanonA4: (dataUrl, opts = {}) => ipcRenderer.invoke('print:canon-a4', { url: dataUrl, ...opts }),

  /** Print a 50mm label to Citizen (expects a data: URL of HTML) */
  printCitizen50: (dataUrl, opts = {}) => ipcRenderer.invoke('print:citizen-50', { url: dataUrl, ...opts }),

  /** Get available printers from main */
  listPrinters: () => ipcRenderer.invoke('print:list'),
});