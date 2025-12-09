import { Vector3 } from 'three';
import { networkManager } from '../services/NetworkManager';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/SoundManager';

class GamePhysics {
    ballPosition = new Vector3(0, 0.5, 0);
    ballVelocity = new Vector3(0, 0, 10); // Start moving towards player

    // Normalized 0-1 for simplicity, mapped to -10 to 10 in render
    paddles = { host: 0, client: 0 };
    paddleWidths = { host: 1.5, client: 1.5 }; // Dynamic widths

    activePowerUp: { position: Vector3, type: 'BIG_PADDLE' } | null = null;
    powerUpTimer = 0;

    private lastUpdate = 0;

    update(delta: number) {
        // Called by loop (Host only)
        // AI Logic for Single Player
        const state = useGameStore.getState();
        if (state.gameMode === 'SINGLE_PLAYER') {
            // AI controls 'client' paddle (Far side)
            // Simple follow with lerp
            const targetX = this.ballPosition.x;
            const currentX = this.paddles.client;

            // Reaction speed factor
            const lerpFactor = 3 * delta;

            // Move towards ball, but cap at limits
            let newX = currentX + (targetX - currentX) * lerpFactor;

            // Boundary check (-9 to 9)
            if (newX > 9) newX = 9;
            if (newX < -9) newX = -9;

            this.paddles.client = newX;
        } else if (!state.isHost) {
            // Only Host runs physics in multiplayer
            return;
        }

        // Power-up Spawning (Randomly every ~15s)
        if (!this.activePowerUp && Math.random() < 0.001) {
            this.activePowerUp = {
                position: new Vector3((Math.random() - 0.5) * 10, 0.5, (Math.random() - 0.5) * 10),
                type: 'BIG_PADDLE'
            };
        }

        // Ball Movement
        this.ballPosition.add(
            this.ballVelocity.clone().multiplyScalar(delta)
        );

        // Wall Collisions (X axis)
        if (this.ballPosition.x > 9.5 || this.ballPosition.x < -9.5) {
            this.ballVelocity.x *= -1;
            soundManager.playBounce();
        }

        if (this.ballPosition.z > 12 && Math.abs(this.ballPosition.x - this.paddles.host) < (this.paddleWidths.host / 2 + 0.5)) {
            // Host Paddle Hit
            this.handlePaddleHit('host');
        }

        // Client Paddle (Z = -13)
        if (this.ballPosition.z < -12 && Math.abs(this.ballPosition.x - this.paddles.client) < (this.paddleWidths.client / 2 + 0.5)) {
            // Client Paddle Hit
            this.handlePaddleHit('client');
        }

        // Power-Up Collision
        if (this.activePowerUp) {
            const dist = this.ballPosition.distanceTo(this.activePowerUp.position);
            if (dist < 1.5) {
                // Trigger Effect (Who hit it? Last hit determines beneficiary)
                // For simplicity, whoever the ball is moving TOWARDS gets the buff? 
                // Or whoever hit it LAST. Let's assume Host if vel.z > 0 (moving to client? No, moving to Client means Host hit it last)
                const beneficiary = this.ballVelocity.z > 0 ? 'host' : 'client';
                this.activatePowerUp(beneficiary);
                this.activePowerUp = null;
            }
        }

        // Reset if out of bounds (Goal)
        if (this.ballPosition.z > 15) {
            // Host scores (Ball went past Client)
            useGameStore.getState().incrementScore('host');
            this.checkWinCondition();
            this.resetBall();
        } else if (this.ballPosition.z < -15) {
            // Client scores
            useGameStore.getState().incrementScore('client');
            this.checkWinCondition();
            this.resetBall();
        }

        // Broadcast at 30Hz (throttle)
        const now = Date.now();
        if (now - this.lastUpdate > 33) {
            networkManager.sendGameUpdate({
                ball: { x: this.ballPosition.x, z: this.ballPosition.z },
                paddles: this.paddles,
                paddleWidths: this.paddleWidths,
                activePowerUp: this.activePowerUp,
                score: useGameStore.getState().scores
            });
            this.lastUpdate = now;
        }
    }

    checkWinCondition() {
        const { host, client } = useGameStore.getState().scores;
        if (host >= 7 || client >= 7) {
            soundManager.playWin(); // Play Win Sound
            networkManager.endGame(host >= 7 ? 'HOST' : 'CLIENT');
        }
    }

    resetBall() {
        soundManager.playScore(); // Play Score Sound
        this.ballPosition.set(0, 0.5, 0);

        // Ensure angle is at least ~10 degrees off center
        // tan(10deg) ~= 0.18. So if Z velocity is 10, X needs to be at least 1.8
        const minX = 2.0;
        const range = 4.0;
        const dir = Math.random() > 0.5 ? 1 : -1;

        const vx = (Math.random() * range + minX) * dir;
        const vz = (Math.random() > 0.5 ? 1 : -1) * 10;

        this.ballVelocity.set(vx, 0, vz);
    }

    activatePowerUp(role: 'host' | 'client') {
        soundManager.playScore(); // Reuse sound or new one
        this.paddleWidths[role] = 3.0; // Double width

        // Reset after 10s
        setTimeout(() => {
            this.paddleWidths[role] = 1.5;
        }, 10000);
    }

    handlePaddleHit(role: 'host' | 'client') {
        const isHost = role === 'host';

        // Reverse Z
        this.ballVelocity.z *= -1;

        // Push ball out of paddle to prevent sticking
        this.ballPosition.z = isHost ? 12 : -12;

        // Speed Increase (capped)
        const currentSpeed = this.ballVelocity.length();
        if (currentSpeed < 25) {
            this.ballVelocity.multiplyScalar(1.05);
        }

        // Angle Enforcement (Minimum X velocity)
        // Ensure |vx| >= 2.0 (approx 11 degrees at vz=10, less at higher speeds but consistent sideways motion)
        const minVx = 2.0;
        if (Math.abs(this.ballVelocity.x) < minVx) {
            const sign = this.ballVelocity.x >= 0 ? 1 : -1;
            // If x is exactly 0, random sign
            const finalSign = this.ballVelocity.x === 0 ? (Math.random() > 0.5 ? 1 : -1) : sign;
            this.ballVelocity.x = minVx * finalSign;
        }

        soundManager.playPaddleHit();
    }

    // Called by Client when receiving update
    syncState(data: any) {
        if (data.ball) {
            this.ballPosition.set(data.ball.x, 0.5, data.ball.z);
        }
        if (data.paddles) {
            this.paddles = data.paddles;
        }
        if (data.paddleWidths) {
            this.paddleWidths = data.paddleWidths;
        }
        if (data.activePowerUp !== undefined) {
            this.activePowerUp = data.activePowerUp;
        }
        if (data.scores) {
            useGameStore.getState().setScores(data.scores);
        }
    }

    // Called by Input System
    updatePaddle(role: 'host' | 'client', x: number) {
        this.paddles[role] = x;
    }

    triggerGesture(role: 'host' | 'client', gesture: string) {
        if (gesture === 'open_palm') {
            // Cooldown or conditional check could go here
            // For now, simple logic: Open Hand = Activate Big Power
            // Prevent spamming
            if (this.paddleWidths[role] === 1.5) {
                this.activatePowerUp(role);
            }
        }
    }
}

export const gamePhysics = new GamePhysics();
