import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { handTracking } from '../services/HandTracking';

export const DebugOverlay: React.FC = () => {
    const { phase, roomId, isHost, debugMode, toggleDebugMode, scores } = useGameStore();
    const [stats, setStats] = useState(handTracking.debugInfo);

    // Poll for updates (since HandTracking service isn't reactive)
    useEffect(() => {
        if (!debugMode) return;
        const interval = setInterval(() => {
            // Create a fresh copy to force re-render
            const newStats = {
                initialized: handTracking.debugInfo.initialized,
                handsDetected: handTracking.debugInfo.handsDetected,
                indexFingerX: handTracking.debugInfo.indexFingerX,
                indexFingerY: handTracking.debugInfo.indexFingerY,
                handSize: handTracking.debugInfo.handSize,
                gesture: handTracking.debugInfo.gesture,
                lastProcessTime: handTracking.debugInfo.lastProcessTime,
                fps: handTracking.debugInfo.fps,
                landmarks: handTracking.debugInfo.landmarks
            };
            console.log('Debug update:', newStats.handsDetected, newStats.indexFingerX);
            setStats(newStats);
        }, 100); // 10Hz update
        return () => clearInterval(interval);
    }, [debugMode]);

    if (!debugMode) {
        return (
            <button
                onClick={toggleDebugMode}
                className="fixed bottom-4 right-4 z-[9999] bg-gray-800 text-white p-2 rounded-full opacity-50 hover:opacity-100 text-xs font-mono border border-gray-600"
            >
                DBG
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-neon-green p-4 rounded border border-neon-green font-mono text-xs w-64 pointer-events-none">
            <h3 className="font-bold border-b border-neon-green mb-2 pb-1">DEBUG MONITOR</h3>

            <div className="space-y-1">
                <div className="flex justify-between">
                    <span>PHASE:</span>
                    <span className="text-white">{phase}</span>
                </div>
                <div className="flex justify-between">
                    <span>ROOM:</span>
                    <span className="text-white">{roomId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span>ROLE:</span>
                    <span className="text-white">{isHost ? 'HOST' : 'CLIENT'}</span>
                </div>
                <div className="flex justify-between">
                    <span>SCORES:</span>
                    <span className="text-white">{scores.host} - {scores.client}</span>
                </div>

                <div className="border-t border-gray-700 my-2 pt-1 text-neon-blue">
                    <strong>HAND TRACKING</strong>
                </div>

                <div className="flex justify-between">
                    <span>INIT:</span>
                    <span className={stats.initialized ? 'text-green-400' : 'text-red-400'}>
                        {stats.initialized ? 'YES' : 'NO'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>HANDS:</span>
                    <span className={stats.handsDetected > 0 ? 'text-green-400' : 'text-yellow-400'}>
                        {stats.handsDetected}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>INDEX X:</span>
                    <span className="text-white">{stats.indexFingerX.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                    <span>LATENCY:</span>
                    <span className="text-white">{stats.lastProcessTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                    <span>FPS:</span>
                    <span className="text-white">{stats.fps.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                    <span>GESTURE:</span>
                    <span className="text-neon-pink font-bold">{stats.gesture}</span>
                </div>
            </div>

            <div className="mt-4 pt-2 border-t border-gray-700 pointer-events-auto">
                <button
                    onClick={toggleDebugMode}
                    className="w-full bg-red-900/50 hover:bg-red-900 text-white py-1 rounded border border-red-700"
                >
                    CLOSE DEBUG
                </button>
            </div>
        </div>
    );
};
