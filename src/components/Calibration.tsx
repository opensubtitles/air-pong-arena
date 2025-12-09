import React, { useEffect, useRef, useState } from 'react';
import { MoveLeft, MoveRight } from 'lucide-react'; // Icons
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

// Helper Component for Circular Progress
const CircularProgress = ({ progress, color = '#00F3FF', size = 112, stroke = 4 }: { progress: number, color?: string, size?: number, stroke?: number }) => {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.max(0, Math.min(progress, 100)) / 100) * circumference;

    return (
        <svg
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none transition-opacity duration-300"
            style={{ width: size, height: size }}
        >
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} fill="transparent" />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke={color}
                strokeWidth={stroke}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-100 ease-linear"
            />
        </svg>
    );
};

export const Calibration: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [step, setStep] = useState<CalibStep>('INIT');
    const [msg, setMsg] = useState('Initializing Environment...');
    const [subMsg, setSubMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'RED' | 'ORANGE' | 'GREEN'>('RED');

    // Camera State
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [showHandHint, setShowHandHint] = useState(false);

    const setPhase = useGameStore((state) => state.setPhase);

    // State for hold timers
    const holdTimer = useRef(0);
    const lastTime = useRef(0);

    const [skeleton, setSkeleton] = useState<{ x: number, y: number }[]>([]);

    // Ghost Paddle State
    const [ghostX, setGhostX] = useState(0.5); // 0-1 range
    const [ghostY, setGhostY] = useState(0.5);

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

                if (videoRef.current) {
                    handTracking.startWebcam(videoRef.current);
                }

                // Check for camera readiness
                const checkCamera = setInterval(() => {
                    if (videoRef.current && videoRef.current.readyState === 4) {
                        clearInterval(checkCamera);
                        // Delay showing "Show Hand" by 500ms
                        setTimeout(() => {
                            setCameraReady(true);
                            setStep('DISTANCE_CHECK');
                            setMsg('Show your hand ✋');
                        }, 500);
                    }
                }, 100);

            } catch (e: any) {
                setMsg('Camera Error');
                setCameraError('Camera access denied or missing. Please enable camera access.');
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

            if (!cameraReady) {
                frameId = requestAnimationFrame(loop);
                return;
            }

            const info = handTracking.debugInfo;
            const hands = info.handsDetected;
            const x = info.indexFingerX; // 0-1
            const y = info.indexFingerY; // Raw Y (0 top - 1 bottom)
            const size = info.handSize;  // ~0.1 to ~0.3 usually
            const gesture = info.gesture;
            const landmarks = info.landmarks || []; // New

            setSkeleton(landmarks); // Update skeleton state

            // Mirror X for display (This is what the user SEES as their cursor)
            const visualX = 1 - x;
            setGhostX(visualX);
            setGhostY(y); // Y is usually not mirrored vertically for display unless CSS does it?
            // CSS `scale-x-[-1]` handles X. Y should be standard.

            // Distance from Center (0.5, 0.5)
            // Note: visualX matches screen logic (0 left, 1 right).
            const distFromCenter = Math.sqrt(Math.pow(visualX - 0.5, 2) + Math.pow(y - 0.5, 2));

            // Global Hand Count Check
            if (hands === 0 && step !== 'INIT') {
                setMsg('Show your hand!');
                setShowHandHint(true);
                setSkeleton([]); // Clear skeleton
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

            // --- GLOBAL TOO CLOSE CHECK ---
            // If hand is massive (too close), nothing works well.
            // Warn user globally.
            if (size > 0.4 && step !== 'INIT') {
                setMsg('TOO CLOSE! 🛑');
                setSubMsg('Move back so we can see your whole hand');
                setStatus('RED');
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
                        setMsg('Too Far! Move closer 🕵️'); // Removing timer debounce for responsiveness
                        setSubMsg(`Size: ${(size * 100).toFixed(0)}%`);
                        currentStatus = 'RED';
                    } else if (size > 0.35) {
                        // Handled by global check mostly, but keep for specificity
                        setMsg('Too Close! Move back 🔙');
                        setSubMsg(`Size: ${(size * 100).toFixed(0)}%`);
                        currentStatus = 'RED';
                    } else {
                        setStep('CENTER_OPEN'); // New step
                        setMsg('Perfect! Center your hand ✋');
                        setSubMsg('Keep it OPEN');
                        holdTimer.current = 0;
                        currentStatus = 'GREEN';
                    }
                    break;

                case 'CENTER_OPEN':
                    /* Relaxed Radial Check: 0.2 radius */
                    // Logic:
                    // 1. If Open Palm detected ANYWHERE -> ORANGE (Guide to Center)
                    // 2. If Open Palm AND Centered -> GREEN (Hold)
                    // 3. Else -> RED (Show Hand)

                    if (gesture === 'open_palm') {
                        if (distFromCenter < 0.2) {
                            holdTimer.current += dt;
                            currentStatus = 'GREEN';

                            // 2000ms hold
                            const p = Math.min((holdTimer.current / 2000) * 100, 100);
                            setProgress(p);
                            // Direct feedback
                            setMsg('Hold Open... ✋');
                            setSubMsg(`${Math.ceil((2000 - holdTimer.current) / 1000)}s`);

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
                            setMsg('Move to CENTER +');
                            setSubMsg(`Distance: ${(distFromCenter * 100).toFixed(0)}%`);
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        // Not showing open palm
                        currentStatus = 'RED';
                        setMsg('Show Open Hand ✋');
                        setSubMsg('');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                case 'CENTER_FIST':
                    /* Relaxed Radial Check: 0.2 radius */
                    if (distFromCenter < 0.2) {
                        if (gesture === 'fist') {
                            holdTimer.current += dt;
                            currentStatus = 'GREEN';

                            const p = Math.min((holdTimer.current / 2000) * 100, 100);
                            setProgress(p);
                            setMsg('Hold Steady... ✊');
                            setSubMsg(`${Math.ceil((2000 - holdTimer.current) / 1000)}s`);

                            if (holdTimer.current > 2000) {
                                setStep('LEFT_MOVE');
                                setMsg('Move LEFT ⬅️');
                                setSubMsg('Keep Fist Closed');
                                holdTimer.current = 0;
                                setProgress(0); // Reset for movement
                            }
                        } else {
                            // Position Good, Gesture Bad -> ORANGE
                            currentStatus = 'ORANGE';
                            // Special hint for "Almost fist" vs "Open"
                            if (gesture === 'open_palm') setMsg('Close your hand! ✊');
                            else setMsg('Squeeze Tighter! ✊');
                            setSubMsg('Knuckles visible?');
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        currentStatus = 'RED';
                        setMsg('Move to CENTER +');
                        setSubMsg('');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                // ... Update other cases to set currentStatus similarly
                case 'LEFT_MOVE':
                    /*
                       Logic Update:
                       Check against visualX to match user perception.
                       User moves physically Left -> Screen Left -> visualX < 0.25
                       Range: 0.25 +/- 0.1 -> 0.15 to 0.35
                    */
                    const inLeftRange = Math.abs(visualX - 0.25) < 0.15; // Relaxed Range (was 0.1)

                    if (inLeftRange) { // Left 1/4
                        if (gesture === 'fist') {
                            holdTimer.current += dt;
                            const p = Math.min((holdTimer.current / 1000) * 100, 100);
                            setProgress(p);
                            currentStatus = 'GREEN';
                            setSubMsg('Hold steady...');

                            if (holdTimer.current > 1000) {
                                setStep('CENTER_RETURN_1');
                                setMsg('Good! Return to CENTER ➡️');
                                holdTimer.current = 0;
                                setProgress(0);
                            }
                        } else {
                            setSubMsg('Keep Fist Closed! ✊');
                            currentStatus = 'ORANGE';
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        // Moving towards left
                        setSubMsg('Move your hand left');
                        currentStatus = 'GREEN';
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                // Simplification for brevity: assume other steps logic holds from previous edit,
                // but need to inject status updating.
                // Since replace_file_content replaces the BLOCK, I must include the rest or break the file.
                // I will include the rest of the cases with status updates.

                case 'CENTER_RETURN_1':
                    // Quick center check (Radial)
                    if (distFromCenter < 0.25) { // Relaxed return check
                        holdTimer.current += dt;
                        currentStatus = 'GREEN';
                        if (holdTimer.current > 500) { // Fast
                            setStep('RIGHT_MOVE');
                            setMsg('Move RIGHT ➡️');
                            setSubMsg('Keep Fist Closed');
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        currentStatus = 'ORANGE'; // Guide back
                        setMsg('Return to CENTER ➡️');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                case 'RIGHT_MOVE':
                    /*
                      Logic Update:
                      Check against visualX.
                      User moves physically Right -> Screen Right -> visualX > 0.75
                      Range: 0.75 +/- 0.1 -> 0.65 to 0.85
                   */
                    const inRightRange = Math.abs(visualX - 0.75) < 0.15; // Relaxed Range

                    if (inRightRange) {
                        if (gesture === 'fist') {
                            holdTimer.current += dt;
                            const p = Math.min((holdTimer.current / 1000) * 100, 100);
                            setProgress(p);
                            currentStatus = 'GREEN';
                            setSubMsg('Hold steady...');

                            if (holdTimer.current > 1000) {
                                setStep('CENTER_RETURN_2');
                                setMsg('Good! Return to CENTER ⬅️');
                                holdTimer.current = 0;
                                setProgress(0);
                            }
                        } else {
                            setSubMsg('Keep Fist Closed! ✊');
                            currentStatus = 'ORANGE';
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        currentStatus = 'GREEN';
                        setSubMsg('Move right...');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                case 'CENTER_RETURN_2':
                    if (distFromCenter < 0.25) {
                        holdTimer.current += dt;
                        currentStatus = 'GREEN';
                        if (holdTimer.current > 500) {
                            setStep('BOOST_TEACH');
                            setMsg('OPEN PALM to Boost! ✋');
                            setSubMsg('Try it now!');
                            holdTimer.current = 0;
                            setProgress(0);
                        }
                    } else {
                        currentStatus = 'RED';
                        setMsg('Return to CENTER ⬅️');
                        holdTimer.current = 0;
                        setProgress(0);
                    }
                    break;

                case 'BOOST_TEACH':
                    if (gesture === 'open_palm') {
                        holdTimer.current += dt;
                        currentStatus = 'GREEN';

                        const p = Math.min((holdTimer.current / 1000) * 100, 100);
                        setProgress(p);

                        if (holdTimer.current > 1000) {
                            setStep('FINAL_CONFIRM');
                            setMsg('Great! Close Fist to PLAY ✊');
                            setSubMsg('Get Ready!');
                            setProgress(0);
                        }
                    } else {
                        currentStatus = 'ORANGE'; // Gesture wrong
                        holdTimer.current = 0;
                        setProgress(0);
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

            setStatus(currentStatus); // Actually update state
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [step, setPhase, cameraReady]);

    const handsDetected = () => handTracking.debugInfo.handsDetected;

    // Skeleton Helper
    // MediaPipe Hand Connections (Indices)
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ];

    return (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white">
            <h2 className="text-4xl mb-2 text-neon-blue font-bold tracking-wider">DOJO TRAINING</h2>

            {/* Error Message */}
            {cameraError && (
                <div className="absolute top-10 bg-red-600/80 p-4 rounded text-white font-bold animate-pulse">
                    {cameraError}
                </div>
            )}

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

                {/* SKELETON OVERLAY */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100 opacity-30">
                    {skeleton.length > 0 && connections.map(([start, end], i) => {
                        const p1 = skeleton[start];
                        const p2 = skeleton[end];
                        if (!p1 || !p2) return null;
                        return (
                            <line
                                key={i}
                                x1={p1.x * 100 + '%'} y1={p1.y * 100 + '%'}
                                x2={p2.x * 100 + '%'} y2={p2.y * 100 + '%'}
                                stroke="#00F3FF"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        );
                    })}
                    {skeleton.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x * 100 + '%'}
                            cy={p.y * 100 + '%'}
                            r={i % 4 === 0 ? 5 : 3}
                            fill={i === 8 ? "#FFFF00" : "#00F3FF"} // Highlight Index Tip
                        />
                    ))}
                </svg>

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none">

                    {/* GLOBAL TOO CLOSE OVERLAY */}
                    {(handTracking.debugInfo.handSize > 0.35 && step !== 'INIT') && (
                        <div className="absolute inset-0 z-[100] bg-red-900/80 flex flex-col items-center justify-center animate-pulse">
                            <div className="text-6xl mb-4">🛑</div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-widest">TOO CLOSE</h2>
                            <p className="text-xl text-white mt-2 font-mono">Move Back 🔙</p>
                        </div>
                    )}

                    {/* Ghost Paddle / Marker */}
                    {(step !== 'INIT' && cameraReady) && (
                        <div
                            className="absolute bg-neon-blue/80 w-6 h-6 border-2 border-white rounded-full shadow-[0_0_15px_#00F3FF] z-10"
                            style={{
                                left: `${ghostX * 100}%`,
                                top: `${ghostY * 100}%`,
                                transform: 'translate(-50%, -50%)',
                                opacity: handsDetected() > 0 ? 1 : 0
                            }}
                        />
                    )}

                    {/* Unified Central overlay for Hand Hint + Calibration Steps */}
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out
                        ${showHandHint ? 'bg-black/60 z-50' : ''}
                    `}>
                        <div className={`relative flex flex-col items-center transition-transform duration-500
                            ${showHandHint ? 'scale-[3.0]' : 'scale-100'}
                        `}>
                            {/* Circular Progress (Shared CENTER) */}
                            {((step === 'CENTER_OPEN' || step === 'CENTER_FIST') && !showHandHint) && (
                                <>
                                    {/* Background Circle (Always visible for context) */}
                                    <div className="absolute rounded-full border-4 border-white/10 w-28 h-28 transform -translate-x-[0px] -translate-y-[0px] pointer-events-none" />

                                    <CircularProgress
                                        progress={progress}
                                        color={step === 'CENTER_FIST' ? '#F0F' : '#00F3FF'}
                                    />
                                </>
                            )}

                            {/* Icons (Context Aware) */}
                            <div className={`transition-colors duration-300 text-6xl scale-x-[-1] ${showHandHint ? 'text-neon-pink animate-pulse' :
                                status === 'GREEN' ? 'text-neon-green' : 'text-white'
                                }`}>
                                {(() => {
                                    if (!cameraReady) return null;

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
                            {showHandHint && cameraReady && (
                                <p className="text-xs mt-4 font-bold text-neon-pink tracking-widest uppercase whitespace-nowrap">Show Hand</p>
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
                                <div className="relative">
                                    {/* Background Circle */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/10 w-24 h-24" />
                                    <CircularProgress progress={progress} color="#FFFF00" size={100} />
                                    <div className="text-6xl text-neon-yellow scale-x-[-1] relative">✊</div>
                                </div>
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
                                <div className="relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/10 w-24 h-24" />
                                    <CircularProgress progress={progress} color="#FFFF00" size={100} />
                                    <div className="text-6xl text-neon-yellow scale-x-[-1] relative">✊</div>
                                </div>
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
