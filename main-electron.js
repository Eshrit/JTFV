import { app, BrowserWindow } from 'electron';
import path, { dirname } from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFilePath = path.join(app.getPath('userData'), 'log.txt');
function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`);
}

let mainWindow;
let serverProcess;

const createWindow = () => {
  log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  const serverPath = isDev
    ? path.join(__dirname, 'server.js')
    : path.join(process.resourcesPath, 'server.js');

  const userDataPath = app.getPath('userData');
  const nodeModulesPath = isDev
    ? path.join(__dirname, 'node_modules')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');

  log('App is ready.');
  log(`Spawning server: ${serverPath}`);
  log(`User data path: ${userDataPath}`);
  log(`NODE_PATH: ${nodeModulesPath}`);

  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
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
