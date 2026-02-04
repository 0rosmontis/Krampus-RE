const { app, BrowserWindow, dialog } = require('electron');
const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const find = require('find-process');
const { exec } = require('child_process');

/* ================== HTTP UI ================== */
const http = express();
http.use(express.static(path.join(__dirname, 'dist')));
http.listen(42773, () => {
  console.log('[HTTP] UI on http://localhost:42773');
});

/* ================== STATE ================== */
let window = null;
let APP_SOCKET = null;
let INJECTED = false;

/* ================== ELECTRON ================== */
function createWindow() {
  window = new BrowserWindow({
    width: 700,
    height: 550,
    minWidth: 500,
    minHeight: 450,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true
    }
  });

  window.loadURL('http://localhost:42773');
  window.setMenu(null);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

/* ================== WS IPC ================== */
const server = new WebSocket.Server({ port: 42772 }, () => {
  console.log('[WS] IPC on ws://localhost:42772');
});

server.on('connection', socket => {
  APP_SOCKET = socket;

  // Fake connect immediately
  socket.send(JSON.stringify({ op: 'connected', data: {} }));

  socket.on('message', async raw => {
    const { op, data } = JSON.parse(raw);

    switch (op) {
      case 'close':
        app.quit();
        break;

      case 'min':
        window.minimize();
        break;

      case 'max':
        window.maximize();
        break;

      case 'restore':
        window.restore();
        break;

      case 'reconnect':
        socket.send(JSON.stringify({ op: 'connected', data: {} }));
        break;

      case 'disconnect':
        INJECTED = false;
        socket.send(JSON.stringify({
          op: 'injected',
          data: { value: false }
        }));
        break;

      case 'inject':
        INJECTED = true;
        socket.send(JSON.stringify({
          op: 'injected',
          data: { value: true }
        }));
        break;

      case 'execute':
        if (!INJECTED) return;
        console.log('[EXECUTE]\n', data.source);
        // hook real injector here later
        break;

      case 'openFile': {
        const files = dialog.showOpenDialogSync(window, {
          properties: ['openFile']
        });
        if (!files) return;

        const content = fs.readFileSync(files[0], 'utf8');
        socket.send(JSON.stringify({
          op: 'setEditor',
          data: { value: content }
        }));
        break;
      }

      case 'closeroblox': {
        const procs = await find('name', 'RobloxPlayerBeta.exe', true);
        if (!procs.length) return;

        exec('taskkill /IM RobloxPlayerBeta.exe /F');
        break;
      }
    }
  });

  socket.on('close', () => {
    APP_SOCKET = null;
    INJECTED = false;
  });
});
