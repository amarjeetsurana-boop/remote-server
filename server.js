const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Express health check route for Render
app.get('/', (req, res) => {
    res.send('District Remote Command Center Signaling Server is Live!');
});

// Socket.io configuration with HTTP Server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// System Active Connections
let monitorSocket = null;
const clients = {}; // District 02, 03...

// 4-Digit Passcode generated for security
const sessionPasscode = Math.floor(1000 + Math.random() * 9000).toString();

// Dynamic PORT assignment for Render deployment
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(` SERVER STARTED ON PORT ${PORT}`);
    console.log(` TODAY SECURITY PASSCODE IS: ${sessionPasscode}`);
    console.log(`==========================================`);
});

io.on('connection', (socket) => {
    
    // Register Role (Monitor vs Client)
    socket.on('register', ({ role, districtId, passcode }) => {
        if (passcode !== sessionPasscode) {
            socket.emit('auth-error', 'Wrong Passcode Received!');
            return;
        }

        socket.role = role;
        socket.districtId = districtId;

        if (role === 'monitor') {
            monitorSocket = socket.id;
            console.log(`[MONITOR CONNECTED] District 01 Active`);
        } else {
            clients[districtId] = socket.id;
            console.log(`[CLIENT CONNECTED] District ${districtId} Active`);
            // Notify Monitor that a new district joined
            if (monitorSocket) {
                io.to(monitorSocket).emit('district-joined', { districtId });
            }
        }
        socket.emit('auth-success');
    });

    // WebRTC Signaling (Video & Audio setup)
    socket.on('webrtc-offer', ({ target, offer, from }) => {
        if (clients[target]) io.to(clients[target]).emit('webrtc-offer', { offer, from });
        if (target === '01' && monitorSocket) io.to(monitorSocket).emit('webrtc-offer', { offer, from });
    });

    socket.on('webrtc-answer', ({ target, answer, from }) => {
        if (clients[target]) io.to(clients[target]).emit('webrtc-answer', { answer, from });
        if (target === '01' && monitorSocket) io.to(monitorSocket).emit('webrtc-answer', { answer, from });
    });

    socket.on('webrtc-ice', ({ target, candidate, from }) => {
        if (clients[target]) io.to(clients[target]).emit('webrtc-ice', { candidate, from });
        if (target === '01' && monitorSocket) io.to(monitorSocket).emit('webrtc-ice', { candidate, from });
    });

    // Full Mouse & Keyboard Access Events (01 -> 02/03)
    socket.on('remote-control-event', (data) => {
        const targetSocket = clients[data.targetDistrict];
        if (targetSocket) {
            io.to(targetSocket).emit('execute-control', data);
        }
    });

    socket.on('disconnect', () => {
        if (socket.role === 'client') {
            delete clients[socket.districtId];
            if (monitorSocket) io.to(monitorSocket).emit('district-left', { districtId: socket.districtId });
        }
    });
});