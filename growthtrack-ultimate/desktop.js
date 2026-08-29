const { app, BrowserWindow } = require('electron');
const path = require('path');
const expressApp = require('./server.js'); // This runs the express server

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the web app running on the express server
  const PORT = process.env.PORT || 3001;
  mainWindow.loadURL(`http://localhost:${PORT}/`);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
