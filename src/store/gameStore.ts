import { create } from 'zustand';

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

    // Actions
    setPhase: (phase: GamePhase) => void;
    setGameMode: (mode: GameMode) => void;
    setRoomId: (roomId: string) => void;
    setPlayerId: (id: string) => void;
    setIsHost: (isHost: boolean) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (id: string) => void;
    setPlayerReady: (id: string, ready: boolean) => void;
    incrementScore: (role: 'host' | 'client') => void;
    setScores: (scores: { host: number; client: number }) => void;
    setError: (error: string | null) => void;
    toggleDebugMode: () => void;
    reset: () => void;
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

    setPhase: (phase) => set({ phase }),
    setGameMode: (mode) => set({ gameMode: mode }),
    setRoomId: (roomId) => set({ roomId }),
    setPlayerId: (id) => set({ playerId: id }),
    setIsHost: (isHost) => set({ isHost }),
    addPlayer: (player) => set((state) => ({
        players: { ...state.players, [player.id]: player }
    })),
    removePlayer: (id) => set((state) => {
        const { [id]: _, ...rest } = state.players;
        return { players: rest };
    }),
    setPlayerReady: (id, ready) => set((state) => ({
        players: {
            ...state.players,
            [id]: { ...state.players[id], ready }
        }
    })),
    incrementScore: (role) => set((state) => ({
        scores: { ...state.scores, [role]: state.scores[role] + 1 }
    })),
    setScores: (scores) => set({ scores }),
    setError: (error) => set({ error }),
    toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
    reset: () => set({
        phase: 'MENU',
        gameMode: 'MULTIPLAYER',
        roomId: null,
        playerId: null,
        isHost: false,
        players: {},
        scores: { host: 0, client: 0 },
        error: null
    })
}));
