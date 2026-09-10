const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const PASSCODE = process.env.PASSCODE || "1234";

app.get('/', (req, res) => {
  res.send('Tactical Remote Command Center Signaling Server is Active.');
});

io.on('connection', (socket) => {
  console.log('[+] New Connection Attempt: ' + socket.id);

  socket.on('auth-request', (data) => {
    const role = data && data.role;
    const district = data && data.district;
    const passcode = data && data.passcode;

    if (passcode === PASSCODE) {
      socket.role = role;
      socket.district = district;
      socket.join('district-' + district);
      socket.join('command-center-global');
      console.log('[✓] Auth Success: ' + socket.id + ' District ' + district + ' as ' + role);
      socket.emit('auth-success', { role: role, district: district });
    } else {
      console.log('[X] Auth Failed: ' + socket.id);
      socket.emit('auth-error', 'Invalid Passcode');
      socket.disconnect(true);
    }
  });

  // Chat
  socket.on('send-chat', (data) => {
    io.emit('receive-chat', {
      sender: data.sender,
      district: data.district,
      text: data.text,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // WebRTC
