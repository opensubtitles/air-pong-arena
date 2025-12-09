import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { useGameStore } from '../store/gameStore';

// In production, this should be an env var
const SIGNALING_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class NetworkManager {
    private socket: Socket | null = null;
    private peers: Map<string, SimplePeer.Instance> = new Map();

    // Initialize Socket Connection
    connect() {
        if (this.socket) return;

        this.socket = io(SIGNALING_URL);

        this.socket.on('connect', () => {
            console.log('Connected to signaling server:', this.socket?.id);
            useGameStore.getState().setPlayerId(this.socket?.id || '');
        });

        this.socket.on('user-connected', (userId: string) => {
            console.log('New user connected:', userId);
            // If I am host, initiate WebRTC connection
            if (useGameStore.getState().isHost) {
                this.addPeer(userId, true);
            }
        });

        this.socket.on('user-disconnected', (userId: string) => {
            console.log('User disconnected:', userId);
            if (this.peers.has(userId)) {
                this.peers.get(userId)?.destroy();
                this.peers.delete(userId);
            }
            useGameStore.getState().removePlayer(userId);
        });

        this.socket.on('signal', (data: { sender: string, signal: any }) => {
            // Received a signal from a peer
            const { sender, signal } = data;

            if (!this.peers.has(sender)) {
                // If we don't have a peer yet, we are likely the receiver/client
                this.addPeer(sender, false);
            }

            this.peers.get(sender)?.signal(signal);
        });

        this.setupGameListeners();
    }

    // Call this after socket is created
    private setupGameListeners() {
        if (!this.socket) return;

        this.socket.on('game-started', () => {
            useGameStore.getState().setPhase('CALIBRATION');
        });

        this.socket.on('game-update', (payload: any) => {
            // If I am client, sync physics
            if (!useGameStore.getState().isHost) {
                const { gamePhysics } = require('../game/GamePhysics'); // Circular dep workaround or use DI
                gamePhysics.syncState(payload.data);
            }
        });

        this.socket.on('game-over', (winnerRole: string) => {
            useGameStore.getState().setPhase('GAME_OVER');
            // We could store the winner in the store too
            console.log('Game Over! Winner:', winnerRole);
        });
    }

    // Create a new room (Host)

    // Create a new room (Host)
    createRoom(): string {
        if (!this.socket) this.connect();

        // Generate random 6 char code
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

        this.socket?.emit('join-room', roomId, this.socket.id);

        useGameStore.getState().setRoomId(roomId);
        useGameStore.getState().setIsHost(true);
        useGameStore.getState().addPlayer({
            id: this.socket?.id || 'host',
            role: 'HOST',
            ready: true,
            name: 'Host'
        });

        return roomId;
    }

    // Join existing room (Client)
    joinRoom(roomId: string) {
        if (!this.socket) this.connect();

        this.socket?.emit('join-room', roomId, this.socket.id);

        useGameStore.getState().setRoomId(roomId);
        useGameStore.getState().setIsHost(false);
        useGameStore.getState().addPlayer({
            id: this.socket?.id || 'client',
            role: 'CLIENT',
            ready: false,
            name: 'Player'
        });
    }

    // Internal: Add Peer Connection
    private addPeer(targetId: string, initiator: boolean) {
        const p = new SimplePeer({
            initiator,
            trickle: false, // For simplicity in local dev (usually true is better for speed)
        });

        p.on('signal', (signal) => {
            this.socket?.emit('signal', {
                sender: this.socket.id,
                receiver: targetId,
                signal
            });
        });

        p.on('connect', () => {
            console.log(`WebRTC Connection established with ${targetId}`);
            // Add player to store if not already there (client side logic)
            useGameStore.getState().addPlayer({
                id: targetId,
                role: initiator ? 'CLIENT' : 'HOST', // If I am host, they are client
                ready: false
            });
        });

        p.on('data', (data) => {
            console.log('Received data:', data.toString());
            // Handle game updates here
        });

        p.on('error', (err) => {
            console.error('Peer error:', err);
        });

        this.peers.set(targetId, p);
    }

    startGame() {
        this.socket?.emit('start-game', useGameStore.getState().roomId);
    }

    sendGameUpdate(data: any) {
        // Broadcast via socket for MVP (should use WebRTC for perf)
        this.socket?.emit('game-update', { roomId: useGameStore.getState().roomId, data });
    }

    endGame(winner: 'HOST' | 'CLIENT') {
        this.socket?.emit('game-over', { roomId: useGameStore.getState().roomId, winner });
    }
}

export const networkManager = new NetworkManager();
