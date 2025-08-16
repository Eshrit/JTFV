import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path, { dirname } from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ⏰ IST time formatter for logs
function getISTTime() {
  const date = new Date();
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).toISOString();
}

const logFilePath = path.join(app.getPath('userData'), 'log.txt');
function log(message) {
  const timestamp = getISTTime();
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
}

let mainWindow;
let serverProcess;

const createWindow = () => {
  log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload: path.join(__dirname, 'preload.js')
    }
  });

  const url = 'http://localhost:3001';
  mainWindow.loadURL(url);
  log(`Loaded URL: ${url}`);

  mainWindow.webContents.on('did-finish-load', () => {
    log('✅ Renderer finished loading.');
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc, validatedURL) => {
    log(`❌ Renderer failed to load ${validatedURL}: ${desc} (${code})`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank') return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

/* ======================
   PRINT HELPERS & IPC
   ====================== */

// Electron/Chromium custom size uses MICRONS (1 mm = 1000 µm)
const mm = n => n * 1000;

const SIZES = {
  A4: 'A4',
  LABEL_50x50: { width: mm(50), height: mm(50) }
};

// Preferred queue names / patterns
const PRINTER_PREFERENCES = {
  CANON: [
    'Canon LBP2900',                 // generic
    'Canon LBP2900 on NEW-PC2017'    // your shared queue
  ],
  CITIZEN: [
    'Citizen CL-E321'
  ]
};

// Compat: get printers (async if available)
async function listPrinters(win) {
  const wc = win.webContents;
  if (typeof wc.getPrintersAsync === 'function') {
    return await wc.getPrintersAsync();
  }
  return wc.getPrinters();
}

// Pick the best available printer by trying exact matches first, then fuzzy “includes”
async function resolvePrinterName(win, preferredNames) {
  const printers = await listPrinters(win);
  const names = printers.map(p => p.name);
  log(`Available printers: ${JSON.stringify(names)}`);

  // Exact, case-sensitive
  for (const want of preferredNames) {
    const found = printers.find(p => p.name === want);
    if (found) return found.name;
  }
  // Exact, case-insensitive
  for (const want of preferredNames) {
    const found = printers.find(p => p.name.toLowerCase() === want.toLowerCase());
    if (found) return found.name;
  }
  // Fuzzy contains, case-insensitive
  for (const want of preferredNames) {
    const found = printers.find(p => p.name.toLowerCase().includes(want.toLowerCase()));
    if (found) return found.name;
  }
  return null;
}

function doPrint(win, { deviceName, pageSize, landscape = false, silent = true, printBackground = true }) {
  log(`🖨️ Printing on "${deviceName}" pageSize=${JSON.stringify(pageSize)} landscape=${landscape}`);
  return new Promise((resolve, reject) => {
    win.webContents.print(
      { deviceName, pageSize, landscape, silent, printBackground },
      (success, failureReason) => {
        if (!success) {
          log(`❌ Print failed: ${failureReason || 'Unknown reason'}`);
          reject(new Error(failureReason || 'Print failed'));
        } else {
          log('✅ Print succeeded');
          resolve();
        }
      }
    );
  });
}

// Use a hidden window + isolated session so settings don’t leak between jobs
function createPrintWindow(url, partition = 'persist:print-default') {
  const w = new BrowserWindow({
    show: false,
    webPreferences: { partition, offscreen: true }
  });
  w.loadURL(url);
  return w;
}

// Bills → Canon LBP2900 (any queue variant) → A4
ipcMain.handle('print:canon-a4', async (event, { url, landscape = false } = {}) => {
  log(`IPC print:canon-a4 URL=${url}`);
  const win = createPrintWindow(url, 'persist:print-bills');
  await new Promise(res => win.webContents.once('did-finish-load', res));
  try {
    const deviceName = await resolvePrinterName(win, PRINTER_PREFERENCES.CANON);
    if (!deviceName) throw new Error('Canon LBP2900 printer not found.');
    await doPrint(win, { deviceName, pageSize: SIZES.A4, landscape });
  } finally {
    win.close();
  }
});

// Barcodes → Citizen CL-E321 → 50x50mm
ipcMain.handle('print:citizen-50', async (event, { url } = {}) => {
  log(`IPC print:citizen-50 URL=${url}`);
  const win = createPrintWindow(url, 'persist:print-barcodes');
  await new Promise(res => win.webContents.once('did-finish-load', res));
  try {
    const deviceName = await resolvePrinterName(win, PRINTER_PREFERENCES.CITIZEN);
    if (!deviceName) throw new Error('Citizen CL-E321 printer not found.');
    await doPrint(win, { deviceName, pageSize: SIZES.LABEL_50x50, landscape: false });
  } finally {
    win.close();
  }
});

/* ======================
   APP LIFECYCLE / SERVER
   ====================== */

app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  // ✅ Use unified unpacked folder in production: app_data
  const basePath = isDev
    ? __dirname
    : path.join(process.resourcesPath, 'app_data');

  const serverPath = path.join(basePath, 'server.cjs');
  const nodeModulesPath = path.join(basePath, 'node_modules');
  const angularDistPath = path.join(basePath, 'dist', 'my-login-app');
  const userDataPath = app.getPath('userData');

  log('======================');
  log('🚀 App starting up...');
  log(`Environment: ${isDev ? 'Development' : 'Production'}`);
  log(`Server path: ${serverPath}`);
  log(`Angular dist path: ${angularDistPath}`);
  log(`User data path: ${userDataPath}`);
  log(`NODE_PATH: ${nodeModulesPath}`);
  log('======================');

  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true',
      NODE_ENV: isDev ? 'development' : 'production',
      RUNNING_IN_ELECTRON: 'true',
      USER_DATA_PATH: userDataPath,
      NODE_PATH: nodeModulesPath
    }
  });

  serverProcess.stdout.on('data', (data) => {
    log(`Server: ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    log(`❗ Server Error: ${data.toString().trim()}`);
  });

  serverProcess.on('close', (code) => {
    log(`Server exited with code ${code}`);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  log('Window closed. Killing server process...');
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  log(`❌ Uncaught exception: ${err.message}`);
  if (serverProcess) serverProcess.kill();
});
