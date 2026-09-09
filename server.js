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
    console.log(`[+] New Connection Attempt: ${socket.id}`);

    socket.on('auth-request', (data) => {
        const { role, district, passcode } = data;

        if (passcode === PASSCODE) {
            socket.role = role;
            socket.district = district;
            
            socket.join(`district-${district}`);
            socket.join('command-center-global');

            console.log(`[✓] Auth Success: Socket ${socket.id} joined District ${district} as ${role}`);
            socket.emit('auth-success', { role, district });
        } else {
            console.log(`[X] Auth Failed: Invalid Passcode from Socket ${socket.id}`);
            socket.emit('auth-error', 'Invalid Passcode');
            socket.disconnect(true);
        }
    });

    // 1. Tactical Text Chat Relay
    socket.on('send-chat', (data) => {
        io.emit('receive-chat', {
            sender: data.sender,
            district: data.district,
            text: data.text,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // 2. WebRTC Stream Signaling Relays
    socket.on('webrtc-offer', (data) => {
        socket.broadcast.emit('webrtc-offer', data);
    });

    socket.on('webrtc-answer', (data) => {
        socket.broadcast.emit('webrtc-answer', data);
    });

    socket.on('webrtc-ice-candidate', (data) => {
        socket.broadcast.emit('webrtc-ice-candidate', data);
    });

    // 3. Remote Mouse Control Event Relay
    socket.on('mouse-click', (data) => {
        socket.broadcast.emit('remote-click', data);
    });

    socket.on('disconnect', () => {
        console.log(`[-] Node Disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`⚡ Command Center Server running on port ${PORT}`);
});
