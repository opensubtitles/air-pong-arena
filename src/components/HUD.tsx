import React from 'react';
import { useGameStore } from '../store/gameStore';
import { POWER_UPS, PowerUpType } from '../game/PowerUps';

const EffectIcon: React.FC<{ type: PowerUpType, label?: boolean }> = ({ type, label }) => {
    const def = POWER_UPS[type];
    return (
        <div className={`flex flex-col items-center ${def.category === 'BUFF' ? 'text-green-400' : 'text-red-400'}`}>
            <div className="text-2xl drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" title={def.description}>
                {def.icon}
            </div>
            {label && <span className="text-[10px] font-bold uppercase tracking-wider">{def.name}</span>}
        </div>
    );
};

export const HUD: React.FC = () => {
    const scores = useGameStore((state) => state.scores);
    const inventory = useGameStore((state) => state.inventory);
    const activeEffects = useGameStore((state) => state.activeEffects); // Map of end times
    const isHost = useGameStore((state) => state.isHost);

    // My Inventory (Host or Client)
    const myRole = isHost ? 'host' : 'client';
    const myItem = inventory[myRole];

    // Relevant Effects
    // 1. Buffs on Me
    // 2. Debuffs on Me (from opponent)
    // 3. Debuffs I put on Opponent? Maybe just show what is affecting ME.
    const myEffects = Object.keys(activeEffects[myRole]).map(key => key as PowerUpType);

    return (
        <div className="absolute top-0 w-full h-full pointer-events-none select-none z-10 font-sans">
            {/* Score Board */}
            <div className="absolute top-8 w-full flex justify-center items-start space-x-12">
                <div className="text-6xl font-black text-neon-pink drop-shadow-[0_0_10px_rgba(255,0,255,0.8)]">
                    {scores.host}
                </div>
                <div className="text-4xl text-white font-mono opacity-50 pt-2">VS</div>
                <div className="text-6xl font-black text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
                    {scores.client}
                </div>
            </div>

            {/* Inventory Slot (Bottom Center) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div
                    key={useGameStore((state) => state.inventoryShake)}
                    className={`w-20 h-20 border-2 border-white/30 bg-black/50 rounded-lg flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-sm ${useGameStore.getState().inventoryShake ? 'animate-shake border-red-500' : ''}`}
                >
                    {myItem ? (
                        <>
                            {/* Background Glow */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: POWER_UPS[myItem].color }} />
                            <EffectIcon type={myItem} />
                            <div className="absolute bottom-1 w-full text-center text-[10px] bg-black/60 text-white truncate px-1">
                                {POWER_UPS[myItem].name}
                            </div>
                        </>
                    ) : (
                        <span className="text-white/20 text-xs text-center">EMPTY<br />SLOT</span>
                    )}
                </div>
                <div className="text-white/50 text-xs font-mono tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    PRESS [SPACE] / [🤚]
                </div>
            </div>

            {/* Active Effects Bar (Right of Screen or under score?) */}
            {/* Let's put Buffs on Left, Debuffs on Right? Or just a row above inventory */}
            {/* Active Effects Bar */}
            <div className="absolute bottom-32 w-full flex justify-center space-x-4">
                {myEffects.map(type => (
                    <div key={type} className="animate-pulse bg-black/40 p-2 rounded-full border border-white/20 backdrop-blur-md">
                        <EffectIcon type={type} label />
                    </div>
                ))}
            </div>

            {/* Notification Toast */}
            {useGameStore.getState().notification && (
                <div key={useGameStore.getState().notification?.id} className="absolute top-1/4 w-full flex justify-center pointer-events-none z-50">
                    <div className="animate-bounce-in bg-black/50 border-y-2 border-white/50 text-white/90 text-2xl font-black italic tracking-widest px-12 py-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] transform -skew-x-12 backdrop-blur-sm"
                        style={{ borderColor: useGameStore.getState().notification?.color || '#fff', color: useGameStore.getState().notification?.color || '#fff' }}>
                        {useGameStore.getState().notification?.text}
                    </div>
                </div>
            )}
        </div>
    );
};
