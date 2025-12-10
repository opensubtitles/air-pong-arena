import { useRef, useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { soundManager } from './services/SoundManager';
import { Menu } from './components/Menu';
import { Lobby } from './components/Lobby';
import { Calibration } from './components/Calibration';
import { GameScene } from './game/GameScene';
import { GameOver } from './components/GameOver';
import { Volume2, VolumeX } from 'lucide-react'; // Icons

import { DebugOverlay } from './components/DebugOverlay';

function App() {
  const phase = useGameStore((state) => state.phase);
  const gameMode = useGameStore((state) => state.gameMode);
  const isMuted = useGameStore((state) => state.isMuted);
  const toggleMute = useGameStore((state) => state.toggleMute);

  // Audio Ref and Prompt State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true); // Force true initially

  // Attempt Autoplay whenever phase or track changes
  useEffect(() => {
    // Basic check for interaction requirement
    const checkAudio = async () => {
      // If we haven't interacted yet, keep prompt open
      if (showAudioPrompt) return;

      if (audioRef.current) {
        if (isMuted) {
          audioRef.current.pause();
          return;
        }
        audioRef.current.volume = (phase === 'CALIBRATION' || phase === 'MENU' || phase === 'LOBBY') ? 0.3 : 0.4;
        try {
          await audioRef.current.play();
        } catch (err) {
          console.log("Autoplay failed, showing prompt");
          setShowAudioPrompt(true);
        }
      }
    };
    checkAudio();
  }, [phase, gameMode, isMuted, showAudioPrompt]);

  const handleUnlockAudio = () => {
    // Resume global context
    soundManager.init();

    // Play background music
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setShowAudioPrompt(false);
      }).catch(console.error);
    } else {
      setShowAudioPrompt(false);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
      <DebugOverlay />

      {/* Global Mute Toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-[100] text-neon-blue hover:text-white transition-colors bg-black/20 p-2 rounded-full backdrop-blur-sm"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
      </button>

      {/* Audio Unlock Overlay */}
      {showAudioPrompt && (
        <div
          className="absolute inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center cursor-pointer backdrop-blur-md animate-in fade-in duration-300"
          onClick={handleUnlockAudio}
        >
          <p className="text-4xl font-black text-neon-green animate-pulse tracking-widest drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
            TAP TO START
          </p>
          <p className="text-gray-400 mt-4 text-sm font-mono">
            Enable Audio & Initialize
          </p>
        </div>
      )}

      {/* Background Animation for Menu */}
      {phase === 'MENU' && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <GameScene demoMode={true} />
        </div>
      )}

      {/* --- CENTRALIZED AUDIO MANAGER --- */}

      {/* Menu Music */}
      {(phase === 'MENU' || phase === 'LOBBY') && (
        <audio
          ref={(el) => { if (el) el.volume = 0.3; }}
          src="./sounds/menu_theme.mp3"
          autoPlay
          loop
          muted={isMuted}
        />
      )}

      {/* Calibration Music */}
      {phase === 'CALIBRATION' && (
        <audio
          ref={(el) => { if (el) el.volume = 0.3; }}
          src="./sounds/calibration_theme.mp3"
          autoPlay
          loop
          muted={isMuted}
        />
      )}

      {/* Game Music (Single vs Multi) */}
      {(phase === 'PLAYING' || phase === 'GAME_OVER') && (
        <audio
          ref={(el) => { if (el) el.volume = 0.4; }}
          src={gameMode === 'MULTIPLAYER' ? "./sounds/multiplayer_theme.mp3" : "./sounds/game_theme.mp3"}
          autoPlay
          loop
          muted={isMuted}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 w-full h-full">
        {phase === 'MENU' && <Menu />}
        {phase === 'LOBBY' && <Lobby />}
        {phase === 'CALIBRATION' && <Calibration />}
        {(phase === 'PLAYING' || phase === 'GAME_OVER') && <GameScene />}
        {phase === 'GAME_OVER' && <GameOver />}
      </div>
    </div>
  );
}

export default App;
