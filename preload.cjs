// preload.cjs
// Run with contextIsolation: true and nodeIntegration: false

const { contextBridge, ipcRenderer } = require('electron');

// Single, unified API (previously you exposed twice, which overwrote the first one)
contextBridge.exposeInMainWorld('electron', {
  /** Print an A4 invoice to Canon (expects a data: URL of HTML) */
  printCanonA4: async (dataUrl, opts = {}) => {
    // opts can include: { landscape?: boolean, margins?: { top, right, bottom, left }, ... }
    return ipcRenderer.invoke('print:canon-a4', { url: dataUrl, ...opts });
  },

  /** Print a 50mm label to Citizen (expects a data: URL of HTML) */
  printCitizen50: async (dataUrl, opts = {}) => {
    // opts optional; kept for symmetry/future expansion
    return ipcRenderer.invoke('print:citizen-50', { url: dataUrl, ...opts });
  },

  /** Get available printers from main */
  listPrinters: async () => ipcRenderer.invoke('print:list'),

  /** Minimal, safe wrapper if you want to invoke other whitelisted channels */
  ipcRenderer: {
    invoke: (channel, args) => ipcRenderer.invoke(channel, args),
  },
});
