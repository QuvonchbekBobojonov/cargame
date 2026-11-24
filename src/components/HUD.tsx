/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerStats, Language } from '../types/game';
import { TRANSLATIONS, WORLD_REGIONS } from '../data/constants';
import {
  Shield,
  Zap,
  Gem,
  Pause,
  Gauge,
  Activity,
  Compass,
  MapPin,
  Trophy,
  Download,
  Utensils,
  BatteryCharging,
  Siren,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  language: Language;
  onPauseToggle: () => void;
  onOpenWorldAtlas?: () => void;
  onOpenPWAInstall?: () => void;
  onInteractPoi?: () => void;
  onToggleExitCar?: () => void;
  onToggleHeadlights?: () => void;
  isPaused: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  language,
  onPauseToggle,
  onOpenWorldAtlas,
  onOpenPWAInstall,
  onInteractPoi,
  onToggleExitCar,
  onToggleHeadlights,
}) => {
  const t = TRANSLATIONS[language];
  const currentReg = WORLD_REGIONS[stats.currentRegion] || WORLD_REGIONS.tashkent;

  const rpmPercent = Math.min(
    100,
    Math.max(0, ((stats.rpm - 900) / 7200) * 100)
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* TOP BAR */}
      <div className="w-full flex items-start justify-between gap-2">
        {/* Left: Score, Hunger, Energy & GAI Status */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-2xl px-3.5 py-1.5 shadow-lg">
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {t.score}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                {stats.score.toLocaleString()}
              </div>
            </div>

            {stats.multiplier > 1 && (
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-sm">
                x{stats.multiplier}
              </div>
            )}
          </div>

          {/* Hunger (Ovqat) & Energy (Dam/Quvvat) */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-amber-800/70 rounded-xl px-2.5 py-1">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300 tabular-nums">
                {Math.round(stats.hunger)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-emerald-800/70 rounded-xl px-2.5 py-1">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
                {Math.round(stats.energy)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/90 border border-cyan-900/70 rounded-xl px-2.5 py-1">
              <Gem className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold text-cyan-300 tabular-nums">
                {stats.crystals}
              </span>
            </div>
          </div>

          {/* GAI Alert / Fines or Race Position */}
          <div className="flex items-center gap-1.5">
            {stats.gaiAlert > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border bg-rose-600/90 border-rose-300 text-white shadow-[0_0_16px_rgba(244,63,94,0.8)] animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[11px] font-black">YPX / GAI QUVMOQDA!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border bg-slate-950/90 border-slate-700 text-slate-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold">
                  {stats.totalRacers > 1
                    ? `${stats.racePosition}/${stats.totalRacers} O‘RIN`
                    : `Jarima: ${stats.gaiFines}`}
                </span>
              </div>
            )}

            {stats.migalkaActive && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600/90 border border-rose-400 text-white text-[11px] font-black">
                <Siren className="w-3.5 h-3.5" />
                <span>MIGALKA</span>
              </div>
            )}

            {!stats.isOnFoot && onToggleHeadlights && (
              <button
                onClick={onToggleHeadlights}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-black cursor-pointer active:scale-95 transition-all ${
                  stats.headlightsOn
                    ? 'bg-amber-400/95 border-amber-200 text-slate-950'
                    : 'bg-slate-950/90 border-slate-700 text-slate-400'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{stats.headlightsOn ? 'FARA: ON' : 'FARA: OFF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Region Badge, Stunt / Alert Banner, Interactive POI Action */}
        <div className="pointer-events-auto flex flex-col items-center max-w-[290px] sm:max-w-md">
          <button
            onClick={onOpenWorldAtlas}
            className="group flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/95 border border-cyan-500/60 hover:border-cyan-300 shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span className="text-lg">{currentReg.flag}</span>
            <div className="flex flex-col text-left">
              <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                <span>
                  {stats.isOnFoot
                    ? '🚶 PIYODA'
                    : `${currentReg.city[language]} • SHAHARLAR ▼`}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                {stats.regionName}
              </div>
            </div>
          </button>

          {stats.lastStuntName && (
            <div className="mt-1.5 px-3 py-0.5 bg-gradient-to-r from-indigo-700/95 to-cyan-700/95 border border-cyan-400/80 rounded-full text-[10px] font-black text-white tracking-wide uppercase text-center">
              {stats.lastStuntName}
            </div>
          )}

          {/* Contextual POI Prompt (Choyxona / Dam olish Bog'i / Zapravka) */}
          {stats.nearbyPoi !== 'none' && (
            <div className="mt-2 flex items-center gap-2 bg-amber-500 border-2 border-amber-200 text-slate-950 px-3.5 py-1.5 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.7)]">
              <div className="text-xs font-black">
                {stats.nearbyPoiLabel}
              </div>
              {onInteractPoi && (
                <button
                  onClick={onInteractPoi}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 text-[11px] font-black cursor-pointer active:scale-95"
                >
                  {stats.nearbyPoi === 'choyxona'
                    ? '🥣 OVQATLANISH (G)'
                    : stats.nearbyPoi === 'rest_park'
                    ? '🌳 DAM OLISH (G)'
                    : '⛽ TO‘LDIRISH (G)'}
                </button>
              )}
              {!stats.isOnFoot && onToggleExitCar && (
                <button
                  onClick={onToggleExitCar}
                  className="px-2 py-1 rounded-xl bg-emerald-700 text-white text-[10px] font-black cursor-pointer"
                >
                  TUSHISH (F)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Shields, Nitro, APK, Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden md:flex bg-slate-950/90 border border-slate-800 rounded-2xl px-3 py-2 flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>{t.shields}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: stats.maxShields }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-2 rounded-sm ${
                    i < stats.shields
                      ? 'bg-emerald-400'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl px-3 py-2 flex flex-col items-end gap-1 min-w-[85px] sm:min-w-[105px]">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
              <span>{t.nitro}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-sm overflow-hidden">
              <div
                style={{ width: `${stats.nitro}%` }}
                className={`h-full transition-all duration-75 ${
                  stats.isNitroActive
                    ? 'bg-gradient-to-r from-cyan-400 to-white'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
              />
            </div>
          </div>

          {onOpenPWAInstall && (
            <button
              onClick={onOpenPWAInstall}
              className="px-2.5 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-300 hover:text-white active:scale-95 transition-all flex items-center gap-1 text-xs font-black cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              <span className="text-[11px] font-black">APK</span>
            </button>
          )}

          <button
            onClick={onPauseToggle}
            className="w-10 h-10 rounded-2xl bg-slate-950/90 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-400 active:scale-95 transition-all cursor-pointer"
            aria-label={t.pause}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM-CENTER: Speedometer, Gear (or R for reverse), RPM, GPS */}
      <div className="self-center flex flex-col items-center pointer-events-auto mb-1 sm:mb-2">
        <div className="bg-slate-950/95 border border-slate-800 rounded-3xl px-4 py-2 sm:px-5 sm:py-2.5 shadow-2xl flex items-center justify-center gap-3 sm:gap-5">
          {/* Gear */}
          <div className="flex flex-col items-center bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
              {stats.isOnFoot ? 'REJIM' : t.gear}
            </span>
            <span className="text-lg sm:text-xl font-black text-cyan-400 tabular-nums">
              {stats.isOnFoot ? '🚶' : stats.gear < 0 ? 'R' : `D${stats.gear}`}
            </span>
          </div>

          {/* Speedometer */}
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                {stats.speed}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{t.kmh}</span>
            </div>
          </div>

          {/* Tachometer RPM */}
          {!stats.isOnFoot && (
            <div className="hidden sm:flex flex-col items-start min-w-[95px]">
              <div className="flex items-center justify-between w-full text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-rose-400" /> {stats.rpm}
                </span>
                <span>{t.rpm}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                <div
                  style={{ width: `${rpmPercent}%` }}
                  className={`h-full transition-all duration-75 ${
                    rpmPercent > 80
                      ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                      : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          <div className="w-px h-7 bg-slate-800 hidden sm:block" />

          {/* GPS Coordinates */}
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 uppercase font-bold">
                GPS: {stats.worldX}m, {stats.worldZ}m
              </span>
              <span className="text-xs font-bold text-slate-200 tabular-nums">
                {stats.distance} {t.meters}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
