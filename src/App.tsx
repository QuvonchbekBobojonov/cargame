/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  ShipModel,
  ShipColor,
  PlayerStats,
  ControlInputState,
  GameSettings,
  WorldRegionId,
} from './types/game';
import { GameEngine } from './game/GameEngine';
import { soundEngine } from './audio/soundEngine';
import { TRANSLATIONS, WORLD_REGIONS } from './data/constants';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { SettingsDock } from './components/SettingsDock';
import { GarageModal } from './components/GarageModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import { WorldAtlasModal } from './components/WorldAtlasModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import {
  Play,
  Sparkles,
  HelpCircle,
  Trophy,
  Globe,
  Monitor,
  Smartphone,
  Navigation,
  Download,
} from 'lucide-react';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // App UI State
  const [gameStatus, setGameStatus] = useState<'menu' | 'playing' | 'paused' | 'game_over'>('menu');
  const [selectedMode, setSelectedMode] = useState<GameMode>('open_world');
  const [selectedRegion, setSelectedRegion] = useState<WorldRegionId>('tashkent');
  const [selectedModel, setSelectedModel] = useState<ShipModel>('malibu2');
  const [selectedColor, setSelectedColor] = useState<ShipColor>('white');

  // Modals
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isWorldAtlasOpen, setIsWorldAtlasOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    language: 'uz',
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.75,
    touchControls: 'always',
    touchStyle: 'buttons',
    cameraMode: 'chase',
    graphicsQuality: 'high',
  });

  // Controls input state (neutral at idle so car moves only when Gaz is pressed)
  const [controlInput, setControlInput] = useState<ControlInputState>({
    steer: 0,
    throttle: 0,
    boost: false,
    jump: false,
    drift: false,
  });

  // Realtime Player Stats
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    highScore: 0,
    distance: 0,
    speed: 0,
    maxSpeedReached: 0,
    gear: 1,
    rpm: 900,
    crystals: 0,
    multiplier: 1,
    comboCount: 0,
    shields: 4,
    maxShields: 4,
    nitro: 100,
    isNitroActive: false,
    lapTime: 0,
    bestLapTime: 0,
    stuntScore: 0,
    lastStuntName: '',
    currentRegion: 'tashkent',
    regionName: 'Katta Ochiq Dunyo • O‘zbekiston',
    regionProgress: 0,
    worldX: 0,
    worldZ: 0,
    racePosition: 1,
    totalRacers: 6,
    isOnFoot: false,
    energy: 100,
    hunger: 100,
    sirenActive: false,
    migalkaActive: false,
    nearbyPoi: 'none',
    nearbyPoiLabel: '',
    nearCar: true,
    gaiAlert: 0,
    gaiFines: 0,
    headlightsOn: true,
  });

  // Touch screen detection
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(isTouch);
  }, []);

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current);
    engineRef.current = engine;

    try {
      const saved = localStorage.getItem('neon_velocity_highscore');
      if (saved) {
        engine.stats.highScore = parseInt(saved, 10) || 0;
        setStats((prev) => ({ ...prev, highScore: engine.stats.highScore }));
      }
    } catch {
      // Storage unavailable
    }

    engine.onStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    engine.onGameOver = (finalStats) => {
      setGameStatus('game_over');
      try {
        localStorage.setItem('neon_velocity_highscore', finalStats.highScore.toString());
      } catch {
        // Storage unavailable
      }
    };

    engine.startAnimationLoop();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update Settings in Engine
  const handleUpdateSettings = useCallback((updates: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };

      if (updates.cameraMode && engineRef.current) {
        engineRef.current.setCameraMode(updates.cameraMode);
      }
      if (updates.soundEnabled !== undefined) {
        soundEngine.setMuted(!updates.soundEnabled);
      }
      if (updates.musicEnabled !== undefined) {
        soundEngine.setMusicMuted(!updates.musicEnabled);
      }
      if (updates.volume !== undefined) {
        soundEngine.setVolume(updates.volume);
      }

      return next;
    });
  }, []);

  const handleSelectModel = (model: ShipModel) => {
    setSelectedModel(model);
    engineRef.current?.setShipModel(model);
  };

  const handleSelectColor = (color: ShipColor) => {
    setSelectedColor(color);
    engineRef.current?.setShipColor(color);
  };

  const handleSelectRegion = (regionId: WorldRegionId) => {
    setSelectedRegion(regionId);
    setStats((prev) => ({
      ...prev,
      currentRegion: regionId,
      regionName: WORLD_REGIONS[regionId].name.uz,
    }));
    engineRef.current?.teleportToRegion(regionId);
  };

  const handleInputChange = useCallback((newInput: ControlInputState) => {
    setControlInput(newInput);
    if (engineRef.current) {
      engineRef.current.input = newInput;
    }
  }, []);

  const handlePatchInput = useCallback((partial: Partial<ControlInputState>) => {
    setControlInput((prev) => {
      const next = { ...prev, ...partial };
      if (engineRef.current) {
        engineRef.current.input = next;
      }
      return next;
    });
  }, []);

  // Keyboard Event Listeners for Computer
  useEffect(() => {
    const activeKeys: Record<string, boolean> = {};

    const updateControlsFromKeys = () => {
      let steer = 0;
      if (activeKeys['ArrowLeft'] || activeKeys['KeyA']) steer -= 1;
      if (activeKeys['ArrowRight'] || activeKeys['KeyD']) steer += 1;

      // Manual GAZ (W / ArrowUp) and TORMOZ (S / ArrowDown)
      let throttle = 0;
      if (activeKeys['ArrowUp'] || activeKeys['KeyW']) throttle += 1;
      if (activeKeys['ArrowDown'] || activeKeys['KeyS']) throttle -= 1;

      const boost =
        activeKeys['ShiftLeft'] === true || activeKeys['ShiftRight'] === true;
      const jump = activeKeys['Space'] === true;
      const drift = activeKeys['ShiftLeft'] === true || activeKeys['ShiftRight'] === true;
      const horn = activeKeys['KeyH'] === true || activeKeys['KeyE'] === true;

      const nextInput: ControlInputState = {
        steer,
        throttle,
        boost,
        jump,
        drift,
        horn,
      };

      handleInputChange(nextInput);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.userGesture();

      if (e.code === 'KeyH' || e.code === 'KeyE') {
        engineRef.current?.triggerHorn();
      }

      if (e.code === 'KeyF' && !e.repeat) {
        engineRef.current?.toggleExitEnterCar();
        return;
      }

      if (e.code === 'KeyG' && !e.repeat) {
        engineRef.current?.interactNearbyPoi();
        return;
      }

      if (e.code === 'KeyL' && !e.repeat) {
        engineRef.current?.toggleMigalkaAndSiren();
        return;
      }

      if (e.code === 'KeyK' && !e.repeat) {
        engineRef.current?.toggleHeadlights();
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameStatus === 'playing') {
          handlePauseToggle();
        } else if (gameStatus === 'paused') {
          handleResume();
        }
        return;
      }

      if (e.code === 'KeyM') {
        setIsWorldAtlasOpen((prev) => !prev);
        return;
      }

      if (e.code === 'KeyC') {
        const modes: ('chase' | 'cockpit' | 'top_down' | 'cinematic')[] = [
          'chase',
          'cockpit',
          'top_down',
          'cinematic',
        ];
        const nextCam =
          modes[(modes.indexOf(settings.cameraMode) + 1) % modes.length];
        handleUpdateSettings({ cameraMode: nextCam });
        return;
      }

      activeKeys[e.code] = true;
      updateControlsFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys[e.code] = false;
      updateControlsFromKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStatus, settings.cameraMode, handleInputChange, handleUpdateSettings]);

  const handleStartGame = (mode: GameMode = selectedMode) => {
    soundEngine.userGesture();
    setGameStatus('playing');
    engineRef.current?.startGame(mode, selectedRegion);
  };

  const handlePauseToggle = () => {
    if (gameStatus === 'playing') {
      setGameStatus('paused');
      if (engineRef.current) engineRef.current.isRunning = false;
      soundEngine.stopEngine();
      soundEngine.stopMusic();
    } else if (gameStatus === 'paused') {
      handleResume();
    }
  };

  const handleResume = () => {
    soundEngine.userGesture();
    setGameStatus('playing');
    if (engineRef.current) engineRef.current.isRunning = true;
    soundEngine.startMusic();
  };

  const handleRestart = () => {
    soundEngine.userGesture();
    setGameStatus('playing');
    engineRef.current?.restartGame();
  };

  const handleMainMenu = () => {
    setGameStatus('menu');
    soundEngine.stopEngine();
    soundEngine.stopMusic();
    if (engineRef.current) {
      engineRef.current.isRunning = false;
      engineRef.current.isGameOver = false;
    }
  };

  const t = TRANSLATIONS[settings.language];
  const showTouchControls =
    gameStatus === 'playing' &&
    (settings.touchControls === 'always' ||
      (settings.touchControls === 'auto' && isTouchDevice));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans game-viewport select-none">
      {/* Three.js Isolated Canvas Mount */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* IN-GAME HUD with World Tour Navigator & Open World POI */}
      {gameStatus === 'playing' && (
        <HUD
          stats={stats}
          language={settings.language}
          onPauseToggle={handlePauseToggle}
          onOpenWorldAtlas={() => setIsWorldAtlasOpen(true)}
          onOpenPWAInstall={() => setIsPWAInstallOpen(true)}
          onInteractPoi={() => engineRef.current?.interactNearbyPoi()}
          onToggleExitCar={() => engineRef.current?.toggleExitEnterCar()}
          onToggleHeadlights={() => engineRef.current?.toggleHeadlights()}
          isPaused={false}
        />
      )}

      {/* MOBILE TOUCH CONTROLS */}
      {showTouchControls && (
        <TouchControls
          input={controlInput}
          stats={stats}
          onInputChange={handleInputChange}
          onPatchInput={handlePatchInput}
          onToggleExitCar={() => engineRef.current?.toggleExitEnterCar()}
          onToggleMigalka={() => engineRef.current?.toggleMigalkaAndSiren()}
          onToggleHeadlights={() => engineRef.current?.toggleHeadlights()}
          onInteractPoi={() => engineRef.current?.interactNearbyPoi()}
          language={settings.language}
          touchStyle={settings.touchStyle}
        />
      )}

      {/* COLLAPSIBLE BOTTOM SETTINGS DOCK */}
      <SettingsDock
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        language={settings.language}
        onOpenWorldAtlas={() => setIsWorldAtlasOpen(true)}
      />

      {/* MAIN MENU OVERLAY */}
      {gameStatus === 'menu' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-4 sm:p-8 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/80 pointer-events-none">
          {/* Top Bar with High Score, Atlas & Controls */}
          <div className="w-full max-w-4xl flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl px-3.5 py-1.5 backdrop-blur-md">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div className="text-xs">
                <span className="text-slate-400 font-medium">{t.highScore}: </span>
                <span className="font-black text-amber-300 tabular-nums">
                  {stats.highScore.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPWAInstallOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 hover:from-emerald-500/40 hover:to-cyan-500/40 border border-emerald-400 text-emerald-300 text-xs font-black backdrop-blur-md transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                title="Telefonga o‘rnatish / APK yuklash"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                <span>📲 {settings.language === 'uz' ? 'APK O‘RNATISH' : 'INSTALL APK'}</span>
              </button>

              <button
                onClick={() => setIsWorldAtlasOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/60 text-cyan-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>{WORLD_REGIONS[selectedRegion].city[settings.language]} ({t.worldRegions})</span>
              </button>

              <button
                onClick={() => setIsControlsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold backdrop-blur-md transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.controlsHelp}</span>
              </button>

              <button
                onClick={() =>
                  handleUpdateSettings({
                    language: settings.language === 'uz' ? 'en' : 'uz',
                  })
                }
                className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-800/60 text-cyan-300 text-xs font-bold backdrop-blur-md transition-colors"
              >
                <span>{settings.language === 'uz' ? 'O‘zbekcha' : 'English'}</span>
              </button>
            </div>
          </div>

          {/* Center Hero Title & Start Button */}
          <div className="flex flex-col items-center text-center max-w-xl pointer-events-auto">
            {/* Brand Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-black tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <span>✦ TOSHKENT & XORAZM KO‘CHALARI 3D ✦</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-rose-400 to-indigo-300 tracking-tight drop-shadow-[0_0_35px_rgba(6,182,212,0.6)]">
              {t.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium max-w-md">
              {settings.language === 'uz'
                ? 'Toshkent shoh ko‘chalari, Toshkent Teleminorasi va qadimiy Xorazm Ichan Qal‘asi ko‘chalari bo‘ylab haqiqiy sport superkarlarida poyga qiling!'
                : 'Race real sports supercars across Tashkent avenues, Tashkent TV Tower, and ancient Khorezm Khiva streets!'}
            </p>

            {/* Mode Selector Tabs (World Tour vs Open World vs Stunt Arena) */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 bg-slate-900/80 border border-slate-800/90 p-1.5 rounded-2xl backdrop-blur-md">
              <button
                onClick={() => setSelectedMode('world_tour')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  selectedMode === 'world_tour'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{t.modeWorldTour}</span>
              </button>

              <button
                onClick={() => setSelectedMode('open_world')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  selectedMode === 'open_world'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t.modeOpenWorld}</span>
              </button>

              <button
                onClick={() => setSelectedMode('stunt_arena')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  selectedMode === 'stunt_arena'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{t.modeStuntArena}</span>
              </button>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <button
                onClick={() => handleStartGame(selectedMode)}
                className="w-full sm:flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{t.startGame}</span>
              </button>

              <button
                onClick={() => setIsGarageOpen(true)}
                className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-100 font-extrabold text-sm flex items-center justify-center gap-2 backdrop-blur-md shadow-lg active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{t.garage}</span>
              </button>
            </div>

            {/* Device Controls Hint */}
            <div className="mt-4 flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                Kompyuter: W/A/S/D & Space
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                Telefon: Sensor djoystik & Nitro
              </span>
            </div>
          </div>

          <div className="h-10" />
        </div>
      )}

      {/* PAUSE MODAL */}
      <PauseModal
        isOpen={gameStatus === 'paused'}
        onResume={handleResume}
        onRestart={handleRestart}
        onOpenGarage={() => setIsGarageOpen(true)}
        onOpenControls={() => setIsControlsOpen(true)}
        onOpenPWAInstall={() => setIsPWAInstallOpen(true)}
        onMainMenu={handleMainMenu}
        language={settings.language}
      />

      {/* GAME OVER MODAL */}
      <GameOverModal
        isOpen={gameStatus === 'game_over'}
        stats={stats}
        onRestart={handleRestart}
        onOpenGarage={() => {
          setGameStatus('menu');
          setIsGarageOpen(true);
        }}
        onMainMenu={handleMainMenu}
        language={settings.language}
      />

      {/* GARAGE & SHIP SELECTOR MODAL */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        selectedModel={selectedModel}
        selectedColor={selectedColor}
        onSelectModel={handleSelectModel}
        onSelectColor={handleSelectColor}
        language={settings.language}
      />

      {/* CONTROLS GUIDE MODAL */}
      <ControlsHelpModal
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
        language={settings.language}
      />

      {/* WORLD ATLAS FAST TRAVEL MODAL */}
      <WorldAtlasModal
        isOpen={isWorldAtlasOpen}
        onClose={() => setIsWorldAtlasOpen(false)}
        currentRegion={stats.currentRegion}
        onSelectRegion={handleSelectRegion}
        language={settings.language}
      />

      {/* PWA & ANDROID APK INSTALL MODAL */}
      <PWAInstallModal
        isOpen={isPWAInstallOpen}
        onClose={() => setIsPWAInstallOpen(false)}
        language={settings.language}
      />
    </div>
  );
}
