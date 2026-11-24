/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ControlInputState, Language, PlayerStats } from '../types/game';
import { TRANSLATIONS } from '../data/constants';
import { soundEngine } from '../audio/soundEngine';
import {
  Zap,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Volume2,
  Siren,
  Footprints,
  CarFront,
  Utensils,
  Lightbulb,
} from 'lucide-react';

interface TouchControlsProps {
  input: ControlInputState;
  stats: PlayerStats;
  onInputChange: (input: ControlInputState) => void;
  onPatchInput?: (partial: Partial<ControlInputState>) => void;
  onToggleExitCar: () => void;
  onToggleMigalka: () => void;
  onToggleHeadlights: () => void;
  onInteractPoi: () => void;
  language: Language;
  touchStyle: 'joystick' | 'buttons';
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  input,
  stats,
  onInputChange,
  onPatchInput,
  onToggleExitCar,
  onToggleMigalka,
  onToggleHeadlights,
  onInteractPoi,
  language,
  touchStyle,
}) => {
  const t = TRANSLATIONS[language];
  const patchInput = useCallback(
    (partial: Partial<ControlInputState>) => {
      soundEngine.userGesture();
      if (onPatchInput) {
        onPatchInput(partial);
      } else {
        onInputChange({ ...input, ...partial });
      }
    },
    [input, onInputChange, onPatchInput]
  );
  const [useTilt, setUseTilt] = useState(false);
  const [tiltActive, setTiltActive] = useState(false);

  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickKnobPos, setJoystickKnobPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  useEffect(() => {
    if (!useTilt) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        const normalized = Math.max(-1, Math.min(1, e.gamma / 25));
        patchInput({ steer: normalized });
        setTiltActive(true);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      setTiltActive(false);
    };
  }, [useTilt, patchInput]);

  const toggleTilt = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission!();
        if (response === 'granted') {
          setUseTilt(!useTilt);
        }
      } catch {
        // fallback
      }
    } else {
      setUseTilt(!useTilt);
    }
  };

  const handleJoystickTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!joystickRef.current) return;
      const touch = e.targetTouches[0];
      if (!touch) return;
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = touch.clientX - centerX;
      const deltaY = touch.clientY - centerY;
      const maxRadius = rect.width / 2;

      const distance = Math.min(maxRadius, Math.hypot(deltaX, deltaY));
      const angle = Math.atan2(deltaY, deltaX);

      const knobX = Math.cos(angle) * distance;
      const knobY = Math.sin(angle) * distance;

      setJoystickKnobPos({ x: knobX, y: knobY });
      const normalizedSteer = knobX / maxRadius;
      patchInput({ steer: normalizedSteer });
    },
    [patchInput]
  );

  const handleJoystickTouchEnd = useCallback(() => {
    setIsJoystickActive(false);
    setJoystickKnobPos({ x: 0, y: 0 });
    patchInput({ steer: 0 });
  }, [patchInput]);

  const handleJoystickTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsJoystickActive(true);
      handleJoystickTouchMove(e.nativeEvent);
    },
    [handleJoystickTouchMove]
  );

  const [activeStyle, setActiveStyle] = useState<'joystick' | 'buttons'>(touchStyle);

  useEffect(() => {
    setActiveStyle(touchStyle);
  }, [touchStyle]);

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-end p-3 sm:p-5 md:p-7 select-none">
      {/* Top right quick action controls: Fara, Migalka, Exit/Enter Car, Style, Tilt */}
      <div className="absolute top-20 right-3 sm:right-5 pointer-events-auto flex flex-wrap items-center justify-end gap-2">
        {!stats.isOnFoot && (
          <>
            <button
              onClick={() => {
                soundEngine.userGesture();
                onToggleHeadlights();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                stats.headlightsOn
                  ? 'bg-amber-400 border-amber-100 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
                  : 'bg-slate-950/90 border-slate-700 text-slate-400 hover:border-amber-400'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{t.headlights}</span>
            </button>

            <button
              onClick={() => {
                soundEngine.userGesture();
                onToggleMigalka();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                stats.migalkaActive
                  ? 'bg-gradient-to-r from-rose-600 to-blue-600 border-white text-white shadow-[0_0_16px_rgba(244,63,94,0.7)]'
                  : 'bg-slate-950/90 border-slate-700 text-slate-200 hover:border-rose-400'
              }`}
            >
              <Siren className="w-3.5 h-3.5" />
              <span>{t.siren}</span>
            </button>
          </>
        )}

        <button
          onClick={() => {
            soundEngine.userGesture();
            onToggleExitCar();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
            stats.isOnFoot
              ? 'bg-emerald-600/90 border-emerald-300 text-white shadow-[0_0_14px_rgba(16,185,129,0.5)]'
              : 'bg-slate-950/90 border-amber-500/60 text-amber-300 hover:border-amber-400'
          }`}
        >
          {stats.isOnFoot ? (
            <>
              <CarFront className="w-3.5 h-3.5" />
              <span>{t.enterCar}</span>
            </>
          ) : (
            <>
              <Footprints className="w-3.5 h-3.5" />
              <span>{t.exitCar}</span>
            </>
          )}
        </button>

        {stats.nearbyPoi !== 'none' && (
          <button
            onClick={() => {
              soundEngine.userGesture();
              onInteractPoi();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 border border-amber-200 text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.7)] active:scale-95 cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>
              {stats.nearbyPoi === 'choyxona'
                ? t.eatFood
                : stats.nearbyPoi === 'rest_park'
                ? t.restNow
                : 'ZAPRAVKA'}
            </span>
          </button>
        )}

        <button
          onClick={() =>
            setActiveStyle((prev) => (prev === 'joystick' ? 'buttons' : 'joystick'))
          }
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-950/85 border border-slate-700 text-cyan-300 active:scale-95 cursor-pointer"
        >
          <span>{activeStyle === 'joystick' ? '🔘 Tugma' : '🕹️ Rul'}</span>
        </button>

        <button
          onClick={toggleTilt}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer ${
            useTilt
              ? 'bg-cyan-600/40 border-cyan-400 text-cyan-200'
              : 'bg-slate-950/85 border-slate-700 text-slate-400'
          }`}
        >
          <Compass className={`w-3.5 h-3.5 ${tiltActive ? 'animate-spin' : ''}`} />
          <span>{useTilt ? 'Tilt ON' : 'Tilt'}</span>
        </button>
      </div>

      <div className="w-full flex items-end justify-between">
        {/* LEFT CONTROL ZONE: Rul (Chap / O'ng) */}
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-300 ml-1">
            {stats.isOnFoot ? 'YURISH (CHAP / O‘NG)' : 'RUL (CHAP / O‘NG)'}
          </div>

          {activeStyle === 'joystick' && !useTilt ? (
            <div
              ref={joystickRef}
              onTouchStart={handleJoystickTouchStart}
              onTouchMove={(e) => handleJoystickTouchMove(e.nativeEvent)}
              onTouchEnd={handleJoystickTouchEnd}
              onTouchCancel={handleJoystickTouchEnd}
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 transition-colors flex items-center justify-center touch-none ${
                isJoystickActive
                  ? 'border-cyan-400 bg-cyan-950/70 shadow-[0_0_24px_rgba(6,182,212,0.4)]'
                  : 'border-slate-700 bg-slate-950/80'
              }`}
            >
              <div className="absolute inset-x-2 flex items-center justify-between text-[10px] font-bold text-slate-500 pointer-events-none">
                <span>◀ CHAP</span>
                <span>O‘NG ▶</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-cyan-500/30" />
              <div
                style={{
                  transform: `translate(${joystickKnobPos.x}px, ${joystickKnobPos.y}px)`,
                }}
                className={`absolute w-12 h-12 rounded-full flex items-center justify-center transition-transform ${
                  isJoystickActive
                    ? 'bg-gradient-to-tr from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                    : 'bg-slate-700 border border-slate-500'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white/50" />
              </div>
            </div>
          ) : !useTilt ? (
            <div className="flex gap-2.5">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  patchInput({ steer: -1 });
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  patchInput({ steer: 0 });
                }}
                onPointerLeave={() => {
                  if (input.steer < 0) patchInput({ steer: 0 });
                }}
                onPointerCancel={() => {
                  if (input.steer < 0) patchInput({ steer: 0 });
                }}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none select-none cursor-pointer ${
                  input.steer < -0.1
                    ? 'border-cyan-300 bg-cyan-600/80 text-white shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-95'
                    : 'bg-slate-950/90 border-slate-700 text-cyan-400 hover:border-cyan-500'
                }`}
                aria-label={t.steerLeft}
              >
                <ChevronLeft className="w-9 h-9 stroke-[2.8]" />
                <span className="text-[11px] font-black tracking-wider text-slate-100">CHAP ◀</span>
              </button>

              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  patchInput({ steer: 1 });
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  patchInput({ steer: 0 });
                }}
                onPointerLeave={() => {
                  if (input.steer > 0) patchInput({ steer: 0 });
                }}
                onPointerCancel={() => {
                  if (input.steer > 0) patchInput({ steer: 0 });
                }}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none select-none cursor-pointer ${
                  input.steer > 0.1
                    ? 'border-cyan-300 bg-cyan-600/80 text-white shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-95'
                    : 'bg-slate-950/90 border-slate-700 text-cyan-400 hover:border-cyan-500'
                }`}
                aria-label={t.steerRight}
              >
                <ChevronRight className="w-9 h-9 stroke-[2.8]" />
                <span className="text-[11px] font-black tracking-wider text-slate-100">O‘NG ▶</span>
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-slate-950/85 border border-slate-700 text-xs text-cyan-300">
              📲 Telefoningizni o‘ng/chapga egib boshqaring
            </div>
          )}
        </div>

        {/* RIGHT CONTROL ZONE: Signal, Nitro, Sakrash, Tormoz & GAZ Pedallari */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* Secondary Row: Horn, Jump, Nitro */}
          <div className="flex items-center gap-2">
            {!stats.isOnFoot && (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  patchInput({ horn: true });
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  patchInput({ horn: false });
                }}
                onPointerCancel={() => patchInput({ horn: false })}
                onPointerLeave={() => {
                  if (input.horn) patchInput({ horn: false });
                }}
                className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center active:scale-95 transition-all touch-none select-none cursor-pointer ${
                  input.horn
                    ? 'bg-amber-500/80 border-amber-300 text-white'
                    : 'bg-slate-950/90 border-amber-600/60 text-amber-400'
                }`}
                aria-label={t.horn}
              >
                <Volume2 className="w-4 h-4 stroke-[2.5]" />
                <span className="text-[8px] font-black mt-0.5">{t.horn}</span>
              </button>
            )}

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                patchInput({ jump: true });
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                patchInput({ jump: false });
              }}
              onPointerCancel={() => patchInput({ jump: false })}
              onPointerLeave={() => {
                if (input.jump) patchInput({ jump: false });
              }}
              className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center active:scale-95 transition-all touch-none select-none cursor-pointer ${
                input.jump
                  ? 'bg-emerald-600 border-emerald-300 text-white'
                  : 'bg-slate-950/90 border-slate-700 text-emerald-400'
              }`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              <span className="text-[8px] font-black">{t.jump}</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                patchInput({ boost: true, throttle: 1 });
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                patchInput({ boost: false, throttle: 0 });
              }}
              onPointerCancel={() => patchInput({ boost: false, throttle: 0 })}
              onPointerLeave={() => {
                if (input.boost) patchInput({ boost: false, throttle: 0 });
              }}
              className={`w-14 h-12 rounded-xl border flex flex-col items-center justify-center active:scale-95 transition-all touch-none select-none cursor-pointer ${
                input.boost
                  ? 'bg-cyan-500 border-white text-white shadow-[0_0_20px_rgba(6,182,212,0.8)]'
                  : 'bg-slate-950/90 border-cyan-500/70 text-cyan-300'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span className="text-[8px] font-black">{t.nitro}</span>
            </button>
          </div>

          {/* Primary Driving Pedals: TORMOZ (Brake/Reverse) & GAZ (Accelerate) */}
          <div className="flex items-end gap-2.5">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                patchInput({ throttle: -1 });
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                patchInput({ throttle: 0 });
              }}
              onPointerCancel={() => patchInput({ throttle: 0 })}
              onPointerLeave={() => {
                if (input.throttle < 0) patchInput({ throttle: 0 });
              }}
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none select-none cursor-pointer ${
                input.throttle < -0.1
                  ? 'bg-rose-600 border-rose-200 text-white shadow-[0_0_24px_rgba(244,63,94,0.8)] scale-95'
                  : 'bg-slate-950/90 border-rose-500/70 text-rose-400'
              }`}
            >
              <span className="text-lg font-black">🛑</span>
              <span className="text-[11px] font-black tracking-wider">
                {stats.isOnFoot ? 'ORQAGA' : t.brake}
              </span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                patchInput({ throttle: 1 });
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                patchInput({ throttle: 0 });
              }}
              onPointerCancel={() => patchInput({ throttle: 0 })}
              onPointerLeave={() => {
                if (input.throttle > 0) patchInput({ throttle: 0 });
              }}
              className={`w-22 h-24 sm:w-24 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none select-none cursor-pointer ${
                input.throttle > 0.1
                  ? 'bg-emerald-500 border-emerald-200 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.9)] scale-95'
                  : 'bg-slate-950/90 border-emerald-500/80 text-emerald-400'
              }`}
            >
              <span className="text-xl font-black">⚡</span>
              <span className="text-xs font-black tracking-wider">
                {stats.isOnFoot ? 'YURISH' : t.gas}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
