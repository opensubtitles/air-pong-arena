import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // In production, restrict this
        methods: ["GET", "POST"]
    }
});

const rooms = new Map(); // Store room state

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        // Basic room logic
        socket.join(roomId);

        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

        // Broadcast to others in room effectively
        socket.to(roomId).emit('user-connected', userId);

        console.log(`User ${userId} joined room ${roomId}. Size: ${roomSize}`);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    socket.on('start-game', (roomId) => {
        io.to(roomId).emit('game-started');
    });

    socket.on('game-update', ({ roomId, data }) => {
        socket.to(roomId).emit('game-update', { data });
    });

    socket.on('game-over', ({ roomId, winner }) => {
        io.to(roomId).emit('game-over', winner);
    });

    // Relay generic signals (offers, answers, candidates)
    socket.on('signal', (data) => {
        console.log(`Relaying signal from ${data.sender} to ${data.receiver}`);
        io.to(data.receiver).emit('signal', {
            sender: data.sender,
            signal: data.signal
        });
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
