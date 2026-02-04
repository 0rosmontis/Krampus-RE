// main.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const find = require('find-process');
const { exec } = require('child_process');

/* ================== HTTP UI ================== */
const http = express();
http.use(express.static(path.join(__dirname, 'dist')));
http.listen(42773, () => console.log('[HTTP] UI on http://localhost:42773'));

/* ================== STATE ================== */
let APP_SOCKET = null;
let INJECTED = false;

/* ================== WS IPC ================== */
const server = new WebSocket.Server({ port: 42772 }, () => {
  console.log('[WS] IPC on ws://localhost:42772');
});

server.on('connection', socket => {
  APP_SOCKET = socket;

  socket.send(JSON.stringify({ op: 'connected', data: {} }));

  socket.on('message', async raw => {
    const { op, data } = JSON.parse(raw);

    switch (op) {
      case 'close':
        process.exit();
        break;

      case 'reconnect':
        socket.send(JSON.stringify({ op: 'connected', data: {} }));
        break;

      case 'disconnect':
        INJECTED = false;
        socket.send(JSON.stringify({ op: 'injected', data: { value: false }}));
        break;

      case 'inject':
        INJECTED = true;
        socket.send(JSON.stringify({ op: 'injected', data: { value: true }}));
        break;

      case 'execute':
        if (!INJECTED) return;
        console.log('[EXECUTE]\n', data.source);
        break;

      case 'openFile':
        // cannot open GUI file dialogs in server, skip
        break;

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
