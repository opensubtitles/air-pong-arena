export const PowerUpType = {
    // BUFFS (Apply to Self)
    BIG_PADDLE: 'BIG_PADDLE',
    MULTI_BALL: 'MULTI_BALL',
    MAGNET_PADDLE: 'MAGNET_PADDLE',
    SHIELD: 'SHIELD',
    LASER_AIM: 'LASER_AIM', // Visual Trajectory
    SPEED_BOOST: 'SPEED_BOOST', // Faster Paddle
    SCORE_MULTIPLIER: 'SCORE_MULTIPLIER', // x2 Goals
    CATCHER: 'CATCHER', // Magnesis-like catch
    SMASH: 'SMASH', // Fast ball return on hit
    FAST_BALL: 'FAST_BALL', // Your hits are faster

    // DEBUFFS (Apply to Opponent)
    SMALL_PADDLE: 'SMALL_PADDLE',
    FOG_BLINDNESS: 'FOG_BLINDNESS',
    INVERT_CONTROLS: 'INVERT_CONTROLS',
    FREEZE: 'FREEZE', // Stun 1s
    SLOW_PADDLE: 'SLOW_PADDLE',
    JITTER: 'JITTER', // Shake
    INVISIBLE_BALL: 'INVISIBLE_BALL',
    GRAVITY_WELL: 'GRAVITY_WELL', // Pulls ball away
    SHRINK_BALL: 'SHRINK_BALL', // Tiny ball
    DELAY: 'DELAY', // Input Lag
    TELEPORT: 'TELEPORT', // Instant Ball Reset
} as const;

export type PowerUpType = typeof PowerUpType[keyof typeof PowerUpType];

export type PowerUpCategory = 'BUFF' | 'DEBUFF';

export interface PowerUpDef {
    id: PowerUpType;
    name: string;
    description: string;
    category: PowerUpCategory;
    duration: number; // ms, 0 if instant
    color: string;
    icon: string; // Emoji for now
}

export const POWER_UPS: Record<PowerUpType, PowerUpDef> = {
    // BUFFS
    [PowerUpType.BIG_PADDLE]: { id: PowerUpType.BIG_PADDLE, name: 'Mega Paddle', description: 'Paddle Width +50%', category: 'BUFF', duration: 10000, color: '#00FF00', icon: '📏' },
    [PowerUpType.MULTI_BALL]: { id: PowerUpType.MULTI_BALL, name: 'Multi Ball', description: 'Spawns a clone ball', category: 'BUFF', duration: 0, color: '#00FFFF', icon: '🎱' },
    [PowerUpType.MAGNET_PADDLE]: { id: PowerUpType.MAGNET_PADDLE, name: 'Magnet', description: 'Ball attracted to paddle', category: 'BUFF', duration: 8000, color: '#FF00FF', icon: '🧲' },
    [PowerUpType.SHIELD]: { id: PowerUpType.SHIELD, name: 'Safety Net', description: 'Blocks one goal', category: 'BUFF', duration: 15000, color: '#0000FF', icon: '🛡️' },
    [PowerUpType.LASER_AIM]: { id: PowerUpType.LASER_AIM, name: 'Laser Sight', description: 'Show ball path', category: 'BUFF', duration: 10000, color: '#FF0000', icon: '🎯' },
    [PowerUpType.SPEED_BOOST]: { id: PowerUpType.SPEED_BOOST, name: 'Turbo', description: 'Paddle Speed +50%', category: 'BUFF', duration: 10000, color: '#FFFF00', icon: '⚡' },
    [PowerUpType.SCORE_MULTIPLIER]: { id: PowerUpType.SCORE_MULTIPLIER, name: 'Double Points', description: 'Next goal x2', category: 'BUFF', duration: 15000, color: '#GOLD', icon: '💰' },
    [PowerUpType.CATCHER]: { id: PowerUpType.CATCHER, name: 'Sticky Paddle', description: 'Catch and launch ball', category: 'BUFF', duration: 10000, color: '#00AA00', icon: '🤲' },
    [PowerUpType.SMASH]: { id: PowerUpType.SMASH, name: 'Power Smash', description: 'Auto-Smash hits', category: 'BUFF', duration: 5000, color: '#FF4500', icon: '💥' },
    [PowerUpType.FAST_BALL]: { id: PowerUpType.FAST_BALL, name: 'Velocity', description: 'Faster shots', category: 'BUFF', duration: 8000, color: '#AA00FF', icon: '🚀' },

    // DEBUFFS
    [PowerUpType.SMALL_PADDLE]: { id: PowerUpType.SMALL_PADDLE, name: 'Tiny Paddle', description: 'Paddle Width -50%', category: 'DEBUFF', duration: 8000, color: '#880000', icon: '🤏' },
    [PowerUpType.FOG_BLINDNESS]: { id: PowerUpType.FOG_BLINDNESS, name: 'Fog of War', description: 'Obscure vision', category: 'DEBUFF', duration: 5000, color: '#555555', icon: '🌫️' },
    [PowerUpType.INVERT_CONTROLS]: { id: PowerUpType.INVERT_CONTROLS, name: 'Confusion', description: 'Controls Reversed', category: 'DEBUFF', duration: 5000, color: '#FF00AA', icon: '😵' },
    [PowerUpType.FREEZE]: { id: PowerUpType.FREEZE, name: 'Ice Age', description: 'Freeze Paddle 1.5s', category: 'DEBUFF', duration: 1500, color: '#00FFFF', icon: '❄️' },
    [PowerUpType.SLOW_PADDLE]: { id: PowerUpType.SLOW_PADDLE, name: 'Sludge', description: 'Speed -50%', category: 'DEBUFF', duration: 8000, color: '#553300', icon: '🐢' },
    [PowerUpType.JITTER]: { id: PowerUpType.JITTER, name: 'Earthquake', description: 'Paddle Shakes', category: 'DEBUFF', duration: 5000, color: '#995500', icon: '🫨' },
    [PowerUpType.INVISIBLE_BALL]: { id: PowerUpType.INVISIBLE_BALL, name: 'Ghost Ball', description: 'Ball Invisible', category: 'DEBUFF', duration: 5000, color: '#FFFFFF', icon: '👻' },
    [PowerUpType.GRAVITY_WELL]: { id: PowerUpType.GRAVITY_WELL, name: 'Vortex', description: 'Pull ball to walls', category: 'DEBUFF', duration: 8000, color: '#220022', icon: '🌀' },
    [PowerUpType.SHRINK_BALL]: { id: PowerUpType.SHRINK_BALL, name: 'Nano Ball', description: 'Small Ball', category: 'DEBUFF', duration: 10000, color: '#000055', icon: '⚫' },
    [PowerUpType.DELAY]: { id: PowerUpType.DELAY, name: 'Lag Spike', description: 'Input Delay', category: 'DEBUFF', duration: 6000, color: '#FFAA00', icon: '⏳' },
    [PowerUpType.TELEPORT]: { id: PowerUpType.TELEPORT, name: 'Portal', description: 'Ball Teleport', category: 'DEBUFF', duration: 0, color: '#9900FF', icon: '🌀' },
};
