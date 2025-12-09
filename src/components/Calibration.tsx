import React, { useEffect, useRef, useState } from 'react';
import { Trash2, MoveLeft, MoveRight } from 'lucide-react'; // Icons
import { handTracking } from '../services/HandTracking';
import { useGameStore } from '../store/gameStore';

type CalibStep =
    | 'INIT'
    | 'DISTANCE_CHECK'
    | 'CENTER_OPEN'
    | 'CENTER_FIST'
    | 'LEFT_MOVE'
    | 'CENTER_RETURN_1'
    | 'RIGHT_MOVE'
    | 'CENTER_RETURN_2'
    | 'BOOST_TEACH'
    | 'FINAL_CONFIRM'
    | 'COMPLETE';

export const Calibration: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [step, setStep] = useState<CalibStep>('INIT');
    const [msg, setMsg] = useState('Initializing Environment...'); // Updated initial text
    const [subMsg, setSubMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'RED' | 'ORANGE' | 'GREEN'>('RED'); // Traffic Light
    const [showHandHint, setShowHandHint] = useState(false); // No Hands detected
    const setPhase = useGameStore((state) => state.setPhase);

    // State for hold timers
    const holdTimer = useRef(0);
    const lastTime = useRef(0);

    // Logic Refs
    const msgTimer = useRef(0); // For debouncing messages
    const graceTimer = useRef(0); // For forgiving hold errors

    // Ghost Paddle State
    const [ghostX, setGhostX] = useState(0.5); // 0-1 range

    const getProgress = () => {
        const steps: CalibStep[] = [
            'DISTANCE_CHECK', 'CENTER_FIST',
            'LEFT_MOVE', 'CENTER_RETURN_1',
            'RIGHT_MOVE', 'CENTER_RETURN_2',
            'BOOST_TEACH', 'FINAL_CONFIRM'
        ];
        const idx = steps.indexOf(step);
        if (step === 'COMPLETE') return 100;
        return idx >= 0 ? (idx / steps.length) * 100 : 0;
    };

    useEffect(() => {
        const init = async () => {
            try {
                if (!handTracking.debugInfo.initialized) {
                    await handTracking.initialize();
                }
                setStep('DISTANCE_CHECK');
                setMsg('Show your hand ✋');
                if (videoRef.current) {
                    handTracking.startWebcam(videoRef.current);
                }
            } catch (e) {
                setMsg('Error: ' + e);
            }
        };
        init();
    }, []);

    // ... (rest of the file until the overlay logic)

    // Inside the render return, locate the overlay div
    /* 
       Updated Logic:
       - Scale: 3.0 (20% bigger than 2.5)
       - Hand Orientation: scale-x-[-1] to flip to Right Hand
    */

    // Returning the modified snippet for the overlay block:


    useEffect(() => {
        let frameId: number;

        const loop = (time: number) => {
            const dt = time - lastTime.current;
            lastTime.current = time;

            // Helper for debounced messages
            const updateMsg = (m: string, s: string) => {
                const now = Date.now();
                if (m !== msg && (now - msgTimer.current > 500)) {
                    setMsg(m);
                    setSubMsg(s);
                    msgTimer.current = now;
                } else if (m === msg) {
                    setSubMsg(s); // SubMsg can update faster (timer)
                }
            };

            const info = handTracking.debugInfo;
            const hands = info.handsDetected;
            const x = info.indexFingerX; // 0-1
            const size = info.handSize;  // ~0.1 to ~0.3 usually
            const gesture = info.gesture;

            // Mirror X for display
            setGhostX(1 - x);

            // Global Hand Count Check
            if (hands === 0 && step !== 'INIT') {
                updateMsg('Show your hand!', '');
                setShowHandHint(true);
                setSubMsg('');
                setStatus('RED'); // Ensure Red Border
                frameId = requestAnimationFrame(loop);
                return;
            }
            setShowHandHint(false);

            if (hands > 1) {
                setMsg('Too many hands! Use ONE only.');
                frameId = requestAnimationFrame(loop);
                return;
            }



            // Reset status default (will be overridden)
            let currentStatus: 'RED' | 'ORANGE' | 'GREEN' = 'RED';

            if (hands === 0 || step === 'INIT') {
                currentStatus = 'RED';
            }

            switch (step) {
                case 'DISTANCE_CHECK':
                    // Need a reasonable size range. 
                    // 0.05 is very far, 0.4 is very close.
                    if (size < 0.1) {
                        updateMsg('Too Far! Move closer 🕵️', `Size: ${(size * 100).toFixed(0)}% (Target > 10%)`);
                        currentStatus = 'RED';
                    } else if (size > 0.35) {
                        updateMsg('Too Close! Move back 🔙', `Size: ${(size * 100).toFixed(0)}% (Target < 35%)`);
                        currentStatus = 'RED';
                    } else {
                        setStep('CENTER_OPEN'); // New step
                        setMsg('Perfect! Center your hand ✋');
                        setSubMsg('Keep it OPEN');
                        holdTimer.current = 0;
                        graceTimer.current = 0;
                        currentStatus = 'GREEN';
                    }
                    break;

                case 'CENTER_OPEN':
                    const isCenteredOpen = Math.abs(x - 0.5) < 0.15;

                    // Logic:
                    // 1. If Open Palm detected ANYWHERE -> ORANGE (Guide to Center)
                    // 2. If Open Palm AND Centered -> GREEN (Hold)
                    // 3. Else -> RED (Show Hand)

                    if (gesture === 'open_palm') {
                        if (isCenteredOpen) {
                            holdTimer.current += dt;
                            graceTimer.current = 0;
                            currentStatus = 'GREEN';

                            // 2000ms hold
                            const p = Math.min((holdTimer.current / 2000) * 100, 100);
                            setProgress(p);
                            updateMsg('Hold Open... ✋', `${Math.ceil((2000 - holdTimer.current) / 1000)}s`);

                            if (holdTimer.current > 2000) {
                                setStep('CENTER_FIST');
                                setMsg('Now CLOSE your hand ✊');
                                setSubMsg('Make a fist');
                                holdTimer.current = 0;
                                setProgress(0); // Reset for next step
                            }
                        } else {
                            // Open Palm but not centered
                            currentStatus = 'ORANGE';
                            const dir = x < 0.5 ? 'Move RIGHT ➡️' : '⬅️ Move LEFT';
                            updateMsg(dir, 'Center your hand');
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        // Not showing open palm
                        currentStatus = 'RED';
                        updateMsg('Show Open Hand ✋', 'In the center');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                case 'CENTER_FIST':
                    const isCentered = Math.abs(x - 0.5) < 0.15; // Target
                    const isFist = gesture === 'fist';

                    if (isCentered) {
                        if (isFist) {
                            holdTimer.current += dt;
                            graceTimer.current = 0; // Reset grace on success
                            currentStatus = 'GREEN';

                            const p = Math.min((holdTimer.current / 2000) * 100, 100);
                            setProgress(p);
                            updateMsg('Hold Steady... ✊', `${Math.ceil((2000 - holdTimer.current) / 1000)}s`);

                            if (holdTimer.current > 2000) {
                                setStep('LEFT_MOVE');
                                setMsg('Move LEFT ⬅️');
                                setSubMsg('Keep Fist Closed');
                                holdTimer.current = 0;
                            }
                        } else {
                            // Position Good, Gesture Bad -> ORANGE
                            currentStatus = 'ORANGE';
                            // Special hint for "Almost fist" vs "Open"
                            if (gesture === 'open_palm') updateMsg('Close your hand! ✊', 'Make a tight fist');
                            else updateMsg('Squeeze Tighter! ✊', 'Knuckles visible?');

                            // In failure state, check grace period
                            if (graceTimer.current < 300) {
                                graceTimer.current += dt;
                                // Maintain green status during grace? maybe orange
                                currentStatus = 'ORANGE';
                            } else {
                                holdTimer.current = 0;
                                setProgress(0);
                            }
                        }
                    } else {
                        currentStatus = 'RED';
                        updateMsg('Move to CENTER', '');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                // ... Update other cases to set currentStatus similarly
                case 'LEFT_MOVE':
                    if (x < 0.2) {
                        setStep('CENTER_RETURN_1');
                        setMsg('Good! Return to CENTER ➡️');
                        holdTimer.current = 0;
                        currentStatus = 'GREEN';
                    } else {
                        if (gesture !== 'fist') {
                            setSubMsg('Keep Fist Closed! ✊');
                            currentStatus = 'ORANGE';
                        } else {
                            setSubMsg('Move your hand left');
                            currentStatus = 'GREEN'; // Position finding...
                        }
                    }
                    break;

                // Simplification for brevity: assume other steps logic holds from previous edit, 
                // but need to inject status updating.
                // Since replace_file_content replaces the BLOCK, I must include the rest or break the file.
                // I will include the rest of the cases with status updates.

                case 'CENTER_RETURN_1':
                    if (Math.abs(x - 0.5) < 0.15) {
                        holdTimer.current += dt;
                        currentStatus = 'GREEN';
                        if (holdTimer.current > 1000) {
                            setStep('RIGHT_MOVE');
                            setMsg('Move RIGHT ➡️');
                            setSubMsg('Keep Fist Closed');
                            holdTimer.current = 0;
                        }
                    } else {
                        currentStatus = 'RED'; // Not centered yet
                    }
                    break;

                case 'RIGHT_MOVE':
                    if (x > 0.8) {
                        setStep('CENTER_RETURN_2');
                        setMsg('Good! Return to CENTER ⬅️');
                        holdTimer.current = 0;
                        currentStatus = 'GREEN';
                    } else {
                        currentStatus = 'GREEN'; // Moving...
                    }
                    break;

                case 'CENTER_RETURN_2':
                    if (Math.abs(x - 0.5) < 0.15) {
                        holdTimer.current += dt;
                        currentStatus = 'GREEN';
                        if (holdTimer.current > 1000) {
                            setStep('BOOST_TEACH');
                            setMsg('OPEN PALM to Boost! ✋');
                            setSubMsg('Try it now!');
                            holdTimer.current = 0;
                        }
                    } else {
                        currentStatus = 'RED';
                    }
                    break;

                case 'BOOST_TEACH':
                    if (gesture === 'open_palm') {
                        holdTimer.current += dt;
                        graceTimer.current = 0;
                        currentStatus = 'GREEN';

                        const p = Math.min((holdTimer.current / 1000) * 100, 100);
                        setProgress(p);

                        if (holdTimer.current > 1000) {
                            setStep('FINAL_CONFIRM');
                            setMsg('Great! Close Fist to PLAY ✊');
                            setSubMsg('Get Ready!');
                        }
                    } else {
                        currentStatus = 'ORANGE'; // Gesture wrong
                        if (graceTimer.current < 300) {
                            graceTimer.current += dt;
                        } else {
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    }
                    break;

                case 'FINAL_CONFIRM':
                    if (gesture === 'fist') {
                        setStep('COMPLETE');
                        setMsg('GO! 🏁');
                        setTimeout(() => setPhase('PLAYING'), 1000);
                    }
                    break;
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [step, setPhase]);

    return (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white">
            <h2 className="text-4xl mb-2 text-neon-blue font-bold tracking-wider">DOJO TRAINING</h2>

            <div className="h-2 w-96 bg-gray-800 rounded mb-6 overflow-hidden">
                <div
                    className="h-full bg-neon-green transition-all duration-300 ease-out"
                    style={{ width: `${getProgress()}%` }}
                />
            </div>

            <div className={`relative border-4 rounded-lg overflow-hidden w-[640px] h-[480px] shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black transition-colors duration-300
                ${status === 'RED' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : ''}
                ${status === 'ORANGE' ? 'border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.5)]' : ''}
                ${status === 'GREEN' ? 'border-neon-green shadow-[0_0_50px_rgba(34,197,94,0.5)]' : ''}
            `}>
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover -scale-x-100 opacity-60"
                    autoPlay
                    playsInline
                    muted
                />

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Ghost Paddle */}
                    {/* Show only AFTER initial calibration (CENTER_FIST) */}
                    {(step === 'LEFT_MOVE' || step === 'RIGHT_MOVE' || step === 'CENTER_RETURN_1' || step === 'CENTER_RETURN_2' || step === 'BOOST_TEACH' || step === 'FINAL_CONFIRM') && (
                        <div
                            className="absolute bottom-10 w-32 h-4 bg-neon-blue/40 border border-neon-blue rounded shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-transform duration-75"
                            style={{
                                left: `${ghostX * 100}%`,
                                transform: 'translateX(-50%)'
                            }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm text-neon-blue font-mono">YOU</div>
                        </div>
                    )}

                    {/* Show Hand Hint Overlay */}
                    {/* Unified Central overlay for Hand Hint + Calibration Steps */}
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out
                        ${showHandHint ? 'bg-black/60 z-50' : ''}
                    `}>
                        <div className={`relative flex flex-col items-center transition-transform duration-500
                            ${showHandHint ? 'scale-[3.0]' : 'scale-100'} 
                        `}>
                            {/* Circular Progress (Shared) */}
                            {((step === 'CENTER_OPEN' || step === 'CENTER_FIST') && !showHandHint) && (
                                <svg className="absolute -top-6 -left-6 w-28 h-28 transform -rotate-90 pointer-events-none transition-opacity duration-300">
                                    <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="transparent" />
                                    <circle
                                        cx="56" cy="56" r="50"
                                        stroke={step === 'CENTER_FIST' ? '#F0F' : '#00F3FF'}
                                        strokeWidth="4"
                                        fill="transparent"
                                        strokeDasharray="314"
                                        strokeDashoffset={314 - (Math.max(0, progress) / 100) * 314}
                                        className="transition-all duration-100 ease-linear"
                                    />
                                </svg>
                            )}

                            {/* Icons (Context Aware) */}
                            <div className={`transition-colors duration-300 text-6xl scale-x-[-1] ${showHandHint ? 'text-neon-pink animate-pulse' :
                                    status === 'GREEN' ? 'text-neon-green' : 'text-white'
                                }`}>
                                {/* Logic: 
                                    If Show Hand Hint -> Show EXPECTED Icon for that step.
                                    If Center Step -> Show EXPECTED Icon.
                                    If Distance Check -> Show Open Hand.
                                */}
                                {(() => {
                                    // Determine expected icon type
                                    const useFist = step === 'CENTER_FIST' || step === 'LEFT_MOVE' || step === 'RIGHT_MOVE' || step.includes('CENTER_RETURN') || step === 'FINAL_CONFIRM';
                                    const icon = useFist ? '✊' : '✋';

                                    // If we are in movement drills, the central icon only appears if we lost tracking (showHandHint)
                                    // Otherwise, we show directional cues instead of a center icon
                                    if (!showHandHint && (step === 'LEFT_MOVE' || step === 'RIGHT_MOVE')) return null;

                                    return <div>{icon}</div>;
                                })()}
                            </div>

                            {/* Text for Show Hand Hint */}
                            {showHandHint && (
                                <p className="text-xs mt-4 font-bold text-neon-pink tracking-widest uppercase whitespace-nowrap scale-x-[-1]">Show Hand</p>
                            )}
                        </div>
                    </div>

                    {/* Movement Drill Visuals (Separate from Central Overlay) */}
                    {step === 'LEFT_MOVE' && !showHandHint && (
                        <>
                            {/* Guide Arrow (30% opacity, long) */}
                            <div className="absolute left-1/4 top-1/2 -translate-y-1/2 translate-x-12 text-neon-yellow/30 pointer-events-none">
                                <MoveLeft className="w-32 h-32" strokeWidth={1} />
                            </div>
                            {/* Target Icon (Solid) at Midpoint (Left 1/4) */}
                            <div className="absolute left-1/4 top-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse -translate-x-full pr-8">
                                <div className="text-6xl text-neon-yellow scale-x-[-1]">✊</div>
                                <div className="text-sm text-neon-yellow font-bold mt-2">TARGET</div>
                            </div>
                        </>
                    )}

                    {step === 'RIGHT_MOVE' && !showHandHint && (
                        <>
                            {/* Guide Arrow (30% opacity, long) */}
                            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 -translate-x-12 text-neon-yellow/30 pointer-events-none">
                                <MoveRight className="w-32 h-32" strokeWidth={1} />
                            </div>
                            {/* Target Icon (Solid) at Midpoint (Right 1/4) */}
                            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse translate-x-full pl-8">
                                <div className="text-6xl text-neon-yellow scale-x-[-1]">✊</div>
                                <div className="text-sm text-neon-yellow font-bold mt-2">TARGET</div>
                            </div>
                        </>
                    )}

                    {step === 'BOOST_TEACH' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-neon-pink/10 animate-pulse">
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center h-24">
                    <p className="text-4xl font-bold text-white mb-2">{msg}</p>
                    <p className="text-xl text-neon-blue font-mono animate-pulse">{subMsg}</p>
                </div>

                {/* Debug Skip */}
                <button
                    onClick={() => setPhase('PLAYING')}
                    className="absolute bottom-4 right-4 text-xs text-gray-700 hover:text-white underline"
                >
                    Skip Training
                </button>
            </div>
        </div>
    );
};
