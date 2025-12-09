import { useGameStore } from './store/gameStore';
import { Menu } from './components/Menu';
import { Lobby } from './components/Lobby';
import { Calibration } from './components/Calibration';
import { GameScene } from './game/GameScene';
import { GameOver } from './components/GameOver';

import { DebugOverlay } from './components/DebugOverlay';

function App() {
  const phase = useGameStore((state) => state.phase);

  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
      <DebugOverlay />

      {/* Background Animation for Menu */}
      {phase === 'MENU' && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <GameScene demoMode={true} />
        </div>
      )}

      {/* Game Music */}
      {phase === 'PLAYING' && (
        <audio
          ref={(el) => { if (el) el.volume = 0.4; }}
          src="./sounds/game_theme.mp3"
          autoPlay
          loop
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
