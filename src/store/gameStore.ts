import { create } from 'zustand';
import { PowerUpType } from '../game/PowerUps';

export type GamePhase = 'MENU' | 'LOBBY' | 'CALIBRATION' | 'PLAYING' | 'GAME_OVER';
export type PlayerRole = 'HOST' | 'CLIENT';

interface Player {
    id: string;
    role: PlayerRole;
    ready: boolean;
    name?: string;
    color?: string;
}

export type GameMode = 'MULTIPLAYER' | 'SINGLE_PLAYER';

interface GameState {
    phase: GamePhase;
    gameMode: GameMode;
    roomId: string | null;
    playerId: string | null; // My ID
    isHost: boolean;
    players: Record<string, Player>;
    scores: { host: number; client: number };
    error: string | null;
    debugMode: boolean;
    isMuted: boolean;

    // AI Difficulty (1: Noob, 2: Easy, 3: Medium, 4: Hard, 5: Impossible)
    difficulty: number;

    // HUD Notifications
    notification: { text: string; color?: string; id: number } | null;
    inventoryShake: number; // Timestamp for shake effect

    // Power Ups System
    // Inventory: What each player is holding (max 1 for now)
    inventory: { host: PowerUpType | null; client: PowerUpType | null };

    // Active Effects: Map of End Times for each effect per player
    // e.g. activeEffects.host[PowerUpType.BIG_PADDLE] = timestamp
    activeEffects: {
        host: Partial<Record<PowerUpType, number>>;
        client: Partial<Record<PowerUpType, number>>;
    };

    // Actions
    setPhase: (phase: GamePhase) => void;
    setGameMode: (mode: GameMode) => void;
    setDifficulty: (level: number) => void;
    setRoomId: (roomId: string) => void;
    setPlayerId: (id: string) => void;
    setIsHost: (isHost: boolean) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (id: string) => void;
    setPlayerReady: (id: string, ready: boolean) => void;
    incrementScore: (role: 'host' | 'client', amount?: number) => void;
    setScores: (scores: { host: number; client: number }) => void;
    setError: (error: string | null) => void;
    toggleDebugMode: () => void;
    toggleMute: () => void;
    reset: () => void;

    // Power Up Actions
    setInventory: (role: 'host' | 'client', item: PowerUpType | null) => void;
    addActiveEffect: (role: 'host' | 'client', effect: PowerUpType, duration: number) => void;
    removeActiveEffect: (role: 'host' | 'client', effect: PowerUpType) => void;
    clearEffects: () => void;
    showNotification: (text: string, color?: string) => void;
    triggerInventoryShake: () => void;
}

export const useGameStore = create<GameState>((set) => ({
    phase: 'MENU',
    gameMode: 'MULTIPLAYER',
    roomId: null,
    playerId: null,
    isHost: false,
    players: {},
    scores: { host: 0, client: 0 },
    error: null,
    debugMode: false,
    isMuted: localStorage.getItem('air_pong_muted') === 'true',
    difficulty: 3, // Default Medium
    notification: null,
    inventoryShake: 0,

    inventory: { host: null, client: null },
    activeEffects: { host: {}, client: {} },

    setPhase: (phase) => set({ phase }),
    setGameMode: (gameMode) => set({ gameMode }),
    setDifficulty: (difficulty) => set({ difficulty }),
    setRoomId: (roomId) => set({ roomId }),
    setPlayerId: (playerId) => set({ playerId }),
    setIsHost: (isHost) => set({ isHost }),
    addPlayer: (player) => set((state) => ({ players: { ...state.players, [player.id]: player } })),
    removePlayer: (id) => set((state) => {
        const newPlayers = { ...state.players };
        delete newPlayers[id];
        return { players: newPlayers };
    }),
    setPlayerReady: (id, ready) => set((state) => ({
        players: { ...state.players, [id]: { ...state.players[id], ready } }
    })),
    incrementScore: (role, amount = 1) => set((state) => ({ scores: { ...state.scores, [role]: state.scores[role] + amount } })),
    setScores: (scores) => set({ scores }),
    setError: (error) => set({ error }),
    toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
    toggleMute: () => set((state) => {
        const newValue = !state.isMuted;
        localStorage.setItem('air_pong_muted', String(newValue));
        return { isMuted: newValue };
    }),

    setInventory: (role, item) => set((state) => ({
        inventory: { ...state.inventory, [role]: item }
    })),
    addActiveEffect: (role, effect, duration) => set((state) => {
        const endTime = Date.now() + duration;
        return {
            activeEffects: {
                ...state.activeEffects,
                [role]: { ...state.activeEffects[role], [effect]: endTime }
            }
        };
    }),
    removeActiveEffect: (role, effect) => set((state) => {
        const newEffects = { ...state.activeEffects[role] };
        delete newEffects[effect];
        return {
            activeEffects: { ...state.activeEffects, [role]: newEffects }
        };
    }),
    clearEffects: () => set({ activeEffects: { host: {}, client: {} } }),
    showNotification: (text, color) => set({ notification: { text, color, id: Date.now() } }),
    triggerInventoryShake: () => set({ inventoryShake: Date.now() }),

    reset: () => set((state) => ({
        phase: 'MENU',
        gameMode: 'MULTIPLAYER',
        roomId: null,
        playerId: null,
        isHost: false,
        players: {},
        scores: { host: 0, client: 0 },
        error: null,
        isMuted: state.isMuted,
        inventory: { host: null, client: null },
        activeEffects: { host: {}, client: {} },
        difficulty: state.difficulty, // Preserve difficulty
        notification: null
    })),
}));
