class SoundManager {
    private context: AudioContext | null = null;
    private enabled: boolean = true;

    private getContext(): AudioContext {
        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.context;
    }

    // Call this on unexpected user interaction to unlock AudioContext
    public init() {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    public playTone(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);

            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    }

    public playBounce() {
        // High techno beep
        this.playTone(600, 'square', 0.1, 0.05);
    }

    public playPaddleHit() {
        // Lower metallic hit
        this.playTone(400, 'sawtooth', 0.1, 0.05);
    }

    public playScore() {
        // Victory trill
        this.playTone(440, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(554, 'sine', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(659, 'sine', 0.2, 0.1), 200);
    }

    public playStart() {
        // "Ready" sound
        this.playTone(220, 'square', 0.2, 0.1);
        setTimeout(() => this.playTone(440, 'square', 0.4, 0.1), 250);
    }

    public playWin() {
        // Win Loop
        this.playTone(523.25, 'triangle', 0.2, 0.1);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.2, 0.1), 200);
        setTimeout(() => this.playTone(783.99, 'triangle', 0.2, 0.1), 400);
        setTimeout(() => this.playTone(1046.50, 'triangle', 0.6, 0.1), 600);
    }
}

export const soundManager = new SoundManager();
