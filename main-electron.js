import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let serverProcess;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadURL('http://localhost:3001');
};

function killServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    console.log('🛑 Node server killed');
  }
}

app.whenReady().then(() => {
  const serverPath = path.join(__dirname, 'server.js');

  serverProcess = spawn('node', [serverPath], {
    shell: true,
    env: {
      ...process.env,
      RUNNING_IN_ELECTRON: 'true',
      USER_DATA_PATH: app.getPath('userData')
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Always clean up
app.on('window-all-closed', () => {
  killServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killServer();
});

app.on('quit', () => {
  killServer();
});
