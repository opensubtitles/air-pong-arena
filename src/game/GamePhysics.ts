import { Vector3 } from 'three';
import { networkManager } from '../services/NetworkManager';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/SoundManager';

import { PowerUpType, POWER_UPS } from './PowerUps';

class GamePhysics {
    ballPosition = new Vector3(0, 0.5, 0);
    ballVelocity = new Vector3(0, 0, 10);

    // Initial Widths
    defaultPaddleWidth = 1.5;
    paddleWidths = { host: 1.5, client: 1.5 };

    // Paddles (X positions)
    paddles = { host: 0, client: 0 };

    // Power Up Orb on Field
    activePowerUp: { position: Vector3, type: PowerUpType } | null = null;

    private lastUpdate = 0;

    // Constants
    private readonly GAME_ROLES = ['host', 'client'] as const;
    private readonly POWER_UP_TYPES = Object.values(PowerUpType);

    // AI Difficulty Settings (Noob -> Impossible)
    private readonly AI_SPEED = [0.5, 1.5, 3.0, 4.5, 8.0];
    private readonly AI_ERROR_CHANCE = [0.4, 0.3, 0.2, 0.1, 0.0];
    private readonly AI_ERROR_MAGNITUDE = [3, 2, 1.5, 0.5, 0];

    constructor() {
        this.resetBall();
    }

    update(delta: number) {
        const state = useGameStore.getState();

        // --- POWER UP SPAWNING ---
        // Chance to spawn if none exists.
        if (!this.activePowerUp && state.phase === 'PLAYING' && Math.random() < 0.002) {
            const randomType = this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)];

            this.activePowerUp = {
                position: new Vector3((Math.random() - 0.5) * 10, 0.5, (Math.random() - 0.5) * 5), // Closer to center Z
                type: randomType
            };
        }

        // --- EFFECT APPLICATION LOOP ---
        this.applyActiveEffects(state, delta);

        // --- AI LOGIC (Single Player) ---
        if (state.gameMode === 'SINGLE_PLAYER') {
            const difficulty = state.difficulty; // 1 to 5
            const levelIndex = Math.max(0, Math.min(difficulty - 1, 4));

            const isConfused = this.hasEffect(state, 'client', PowerUpType.INVERT_CONTROLS);
            const isFrozen = this.hasEffect(state, 'client', PowerUpType.FREEZE);
            const isJitter = this.hasEffect(state, 'client', PowerUpType.JITTER);

            if (!isFrozen) {
                let targetX = this.ballPosition.x;

                // Difficulty Tuning
                const baseSpeed = this.AI_SPEED[levelIndex] || 3.0;
                const errorChance = this.AI_ERROR_CHANCE[levelIndex] || 0.1;
                const errorMagnitude = this.AI_ERROR_MAGNITUDE[levelIndex] || 1.0;

                // Apply Effects
                if (isConfused) targetX *= -1;
                if (isJitter) targetX += (Math.random() - 0.5) * 4;

                // Simulate Mistakes/Imperfection (Random per frame is chaotic, but works for "twitchy" AI)
                // Better AI would calculate specific error target per hit, but this suffices for arcade feel
                if (Math.random() < errorChance) {
                    targetX += (Math.random() - 0.5) * errorMagnitude;
                }

                const currentX = this.paddles.client;
                // Move towards target
                const lerpFactor = baseSpeed * delta;

                let newX = currentX + (targetX - currentX) * lerpFactor;

                // Clamp
                if (newX > 9) newX = 9;
                if (newX < -9) newX = -9;

                this.paddles.client = newX;
            }
        } else if (!state.isHost) {
            return; // Client doesn't run physics
        }

        // --- PHYSICS STEP ---

        // Ball Movement
        const nextPos = this.ballPosition.clone().add(this.ballVelocity.clone().multiplyScalar(delta));

        // 1. Wall Collisions
        if (nextPos.x > 9.5 || nextPos.x < -9.5) {
            this.ballVelocity.x *= -1;
            soundManager.playBounce();
        }

        // 2. Paddle Collisions
        // Host (Near, Z ~ 13)
        if (nextPos.z > 12.5 && this.ballVelocity.z > 0) {
            if (Math.abs(nextPos.x - this.paddles.host) < (this.paddleWidths.host / 2 + 0.5)) {
                this.handlePaddleHit('host');
            }
        }
        // Client (Far, Z ~ -13)
        if (nextPos.z < -12.5 && this.ballVelocity.z < 0) {
            if (Math.abs(nextPos.x - this.paddles.client) < (this.paddleWidths.client / 2 + 0.5)) {
                this.handlePaddleHit('client');
            }
        }

        // Update Position
        this.ballPosition.add(this.ballVelocity.clone().multiplyScalar(delta));

        // 3. Power Up Collection (Ball Hit)
        if (this.activePowerUp) {
            const dist = this.ballPosition.distanceTo(this.activePowerUp.position);
            // Relaxed distance for better feel (Ball ~0.5, Orb ~0.5, + wiggle room)
            if (dist < 2.5) {
                // Determine who hit it (Last velocity direction?)
                // Simple logic: if moving +Z (away from Host camera), Host hit it towards Client?
                // Actually usually "Last Hitter" gets it.
                // If velocity.z > 0, Host hit it. If velocity.z < 0, Client hit it.
                const Collector = this.ballVelocity.z > 0 ? 'host' : 'client';
                const type = this.activePowerUp.type;
                const def = POWER_UPS[type];

                soundManager.playPoint();

                // Notification
                state.showNotification(`${def.name} COLLECTED!`, def.color);

                // Auto-Activate Instant Effects
                if (def.duration === 0) {
                    this.applyInstantEffect(state, Collector, type);
                } else {
                    // Add to inventory
                    // If full, replace? Or ignore? Let's replace.
                    state.setInventory(Collector, type);
                }

                this.activePowerUp = null; // Despawn
            }
        }

        // 4. Scoring
        if (this.ballPosition.z > 15) {
            this.scorePoint('client'); // Ball passed Host
        } else if (this.ballPosition.z < -15) {
            this.scorePoint('host'); // Ball passed Client
        }

        // --- NETWORK SYNC (Host Only) ---
        const now = Date.now();
        if (now - this.lastUpdate > 33) { // 30Hz
            networkManager.sendGameUpdate({
                ball: { x: this.ballPosition.x, z: this.ballPosition.z },
                paddles: this.paddles,
                paddleWidths: this.paddleWidths,
                activePowerUp: this.activePowerUp,
                score: state.scores,
                // We should also sync effects maybe? Or let state sync handle it via actions
                // For now, let's rely on actions syncing via store/network manager if configured,
                // but currently NetworkManager only syncs this `sendGameUpdate` payload for high freq data.
                // State like 'inventory' and 'activeEffects' might need explicit sync if not covered.
                // Assuming `syncState` on client handles this payload.
            });
            this.lastUpdate = now;
        }
    }

    applyActiveEffects(state: any, delta: number) {
        // Reset widths to default before applying modifiers
        this.paddleWidths.host = this.defaultPaddleWidth;
        this.paddleWidths.client = this.defaultPaddleWidth;

        // Apply Logic for both roles
        this.GAME_ROLES.forEach(role => {
            const effects = state.activeEffects[role];
            const now = Date.now();

            // Cleanup expired
            Object.keys(effects).forEach(key => {
                // @ts-ignore
                if (effects[key] < now) useGameStore.getState().removeActiveEffect(role, key);
            });

            // Width Modifiers
            if (this.hasEffect(state, role, PowerUpType.BIG_PADDLE)) this.paddleWidths[role] = 3.0;
            if (this.hasEffect(state, role, PowerUpType.SMALL_PADDLE)) this.paddleWidths[role] = 0.8;

            // Gravity Well (Ball Pull)
            if (this.hasEffect(state, role, PowerUpType.GRAVITY_WELL)) {
                // Pull ball towards walls? Or random? Let's pull away from Center X
                // Only if ball is on their side? 
                const isSide = (role === 'host' && this.ballPosition.z > 0) || (role === 'client' && this.ballPosition.z < 0);
                if (isSide) {
                    this.ballVelocity.x += (this.ballPosition.x > 0 ? 10 : -10) * delta;
                }
            }
        });
    }

    hasEffect(state: any, role: string, type: PowerUpType): boolean {
        const end = state.activeEffects[role][type];
        return end && end > Date.now();
    }

    scorePoint(winner: 'host' | 'client') {
        const state = useGameStore.getState();
        // Check Multiplier
        let points = 1;
        if (this.hasEffect(state, winner, PowerUpType.SCORE_MULTIPLIER)) points = 2;

        state.incrementScore(winner, points);
        this.checkWinCondition();
        this.resetBall();
    }

    handlePaddleHit(role: 'host' | 'client') {
        const state = useGameStore.getState();

        // Bounce
        this.ballVelocity.z *= -1;
        // Anti-stick
        this.ballPosition.z = role === 'host' ? 12 : -12;

        // Base Speed Increase
        let speedMult = 1.05;
        if (this.hasEffect(state, role, PowerUpType.FAST_BALL)) speedMult = 1.2;
        if (this.hasEffect(state, role, PowerUpType.SMASH)) speedMult = 1.5;

        // Catcher Logic
        if (this.hasEffect(state, role, PowerUpType.CATCHER)) {
            // Hold ball? For simplicity, just stop X/Z velocity for a moment? 
            // Implementing hold logic in physics loop is complex. 
            // Let's just slow it down drastically then launch?
            this.ballVelocity.z *= 0.1; // Slow release
        }

        this.ballVelocity.multiplyScalar(speedMult);

        // Cap Speed
        if (this.ballVelocity.length() > 30) this.ballVelocity.setLength(30);

        // Min X angle
        if (Math.abs(this.ballVelocity.x) < 2) {
            this.ballVelocity.x = (Math.random() > 0.5 ? 2 : -2);
        }

        soundManager.playPaddleHit();
    }

    // --- INPUT ACTIONS ---

    updatePaddle(role: 'host' | 'client', rawX: number) {
        const state = useGameStore.getState();

        // Effect: Invert Controls
        let effectiveX = rawX;
        if (this.hasEffect(state, role, PowerUpType.INVERT_CONTROLS)) {
            effectiveX = -rawX;
        }

        // Effect: Freeze
        if (this.hasEffect(state, role, PowerUpType.FREEZE)) {
            return; // No movement
        }

        // Effect: Jitter
        if (this.hasEffect(state, role, PowerUpType.JITTER)) {
            effectiveX += (Math.random() - 0.5) * 2;
        }

        this.paddles[role] = effectiveX;
    }

    useInventory(role: 'host' | 'client') {
        const state = useGameStore.getState();
        const item = state.inventory[role];
        if (!item) return;

        // Consume
        state.setInventory(role, null);

        // Apply
        const def = POWER_UPS[item];

        // Notify
        state.showNotification(`${def.name} ACTIVATED!`, def.category === 'BUFF' ? '#00ff00' : '#ff0000');

        // Target Logic: Buffs for Self, Debuffs for Enemy
        const opponent = role === 'host' ? 'client' : 'host';
        const target = def.category === 'BUFF' ? role : opponent;

        soundManager.playScore(); // Activation sound (reuse for now)

        // Apply Effect Logic
        if (def.duration > 0) {
            state.addActiveEffect(target, item, def.duration);
        } else {
            this.applyInstantEffect(state, role, item);
        }
    }

    applyInstantEffect(state: any, _role: 'host' | 'client', type: PowerUpType) {
        if (type === PowerUpType.MULTI_BALL) {
            // Placeholder: Just warn
            state.showNotification("MULTI BALL! (Speed Boost)", "#FFFF00");
            this.ballVelocity.multiplyScalar(1.5);
        }
        else if (type === PowerUpType.TELEPORT) {
            // Teleport ball to center
            this.ballPosition.set(0, 0.5, 0);
            this.ballVelocity.x = (Math.random() - 0.5) * 10;
        }
    }

    triggerGesture(role: 'host' | 'client', gesture: string) {
        // Map Open Palm to Use Item
        if (gesture === 'open_palm') {
            // Add debounce?
            const state = useGameStore.getState();
            if (state.inventory[role]) {
                this.useInventory(role);
            }
        }
    }

    // --- UTILS ---
    checkWinCondition() {
        const { host, client } = useGameStore.getState().scores;
        if (host >= 7 || client >= 7) {
            soundManager.playWin();
            networkManager.endGame(host >= 7 ? 'HOST' : 'CLIENT');
        }
    }

    resetBall() {
        soundManager.playScore();
        this.ballPosition.set(0, 0.5, 0);
        const dir = Math.random() > 0.5 ? 1 : -1;
        this.ballVelocity.set(3 * dir, 0, (Math.random() > 0.5 ? 1 : -1) * 10);
    }

    // Client Sync
    syncState(data: any) {
        if (data.ball) this.ballPosition.set(data.ball.x, 0.5, data.ball.z);
        if (data.paddles) this.paddles = data.paddles;
        if (data.paddleWidths) this.paddleWidths = data.paddleWidths;
        if (data.activePowerUp !== undefined) this.activePowerUp = data.activePowerUp;
        if (data.score) useGameStore.getState().setScores(data.score);
        // Inventory/Effects syncing should be added here ideally
    }
}

export const gamePhysics = new GamePhysics();
