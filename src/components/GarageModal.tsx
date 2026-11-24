/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShipModel, ShipColor, Language } from '../types/game';
import { VEHICLES, COLOR_SCHEMES, TRANSLATIONS } from '../data/constants';
import { X, Shield, Gauge, Activity, Sparkles, Check } from 'lucide-react';
import { CarShowroom3D } from './CarShowroom3D';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ShipModel;
  selectedColor: ShipColor;
  onSelectModel: (model: ShipModel) => void;
  onSelectColor: (color: ShipColor) => void;
  language: Language;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  selectedColor,
  onSelectModel,
  onSelectColor,
  language,
}) => {
  const [filterCat, setFilterCat] = useState<'all' | 'uzbek' | 'supercar'>('all');

  if (!isOpen) return null;

  const t = TRANSLATIONS[language];
  const allVehicles = Object.values(VEHICLES);
  const vehicleList =
    filterCat === 'all'
      ? allVehicles
      : allVehicles.filter((v) => v.category === filterCat);
  const colorList = Object.values(COLOR_SCHEMES);
  const currentVehicle = VEHICLES[selectedModel];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-950/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>{t.garage}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'uz'
                ? 'Barcha O‘zbek moshinalari (Malibu, Gentra, Cobalt, Damas, BYD...) — 3D ko‘rinishda!'
                : 'All Uzbek cars & supercars — live interactive 3D showroom'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3D INTERACTIVE CAR SHOWROOM TURNTABLE */}
        <div className="flex flex-col gap-1.5">
          <CarShowroom3D model={selectedModel} color={selectedColor} />
        </div>

        {/* Category Filter & Vehicle Selection Cards */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {t.selectVehicle} ({vehicleList.length})
            </label>
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterCat('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterCat === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'uz' ? 'Barchasi' : 'All'}
              </button>
              <button
                onClick={() => setFilterCat('uzbek')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterCat === 'uzbek'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇺🇿 {language === 'uz' ? 'O‘zbek Moshinalari' : 'Uzbek Cars'}
              </button>
              <button
                onClick={() => setFilterCat('supercar')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterCat === 'supercar'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏎️ {language === 'uz' ? 'Superkarlar' : 'Supercars'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicleList.map((veh) => {
              const isSelected = veh.id === selectedModel;
              return (
                <button
                  key={veh.id}
                  onClick={() => onSelectModel(veh.id)}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <div className="inline-block px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[10px] font-black text-cyan-300 mb-1.5">
                      {veh.badge}
                    </div>
                    <div className="font-extrabold text-sm sm:text-base text-white pr-6">
                      {veh.name[language]}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {veh.description[language]}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>{veh.topSpeed} km/h</span>
                    <span className="text-emerald-400">
                      {veh.shieldMax}x {t.shields}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Ship Stats Specs */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {currentVehicle.name[language]} — Xususiyatlar
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Speed */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.statsSpeed}</span>
              </div>
              <div className="font-black text-sm sm:text-base text-white">
                {currentVehicle.topSpeed} km/h
              </div>
            </div>

            {/* Acceleration */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.statsAccel}</span>
              </div>
              <div className="font-black text-sm sm:text-base text-white">
                {currentVehicle.acceleration}/10
              </div>
            </div>

            {/* Handling */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.statsHandling}</span>
              </div>
              <div className="font-black text-sm sm:text-base text-white">
                {currentVehicle.handling}/10
              </div>
            </div>

            {/* Shields */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.statsShield}</span>
              </div>
              <div className="font-black text-sm sm:text-base text-emerald-400">
                {currentVehicle.shieldMax} Qatlam
              </div>
            </div>
          </div>
        </div>

        {/* Color Palette Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {t.selectColor}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {colorList.map((col) => {
              const isSelected = col.id === selectedColor;
              return (
                <button
                  key={col.id}
                  onClick={() => onSelectColor(col.id)}
                  style={{
                    borderColor: isSelected ? col.cssGlow : undefined,
                    boxShadow: isSelected ? `0 0 16px ${col.cssGlow}66` : undefined,
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-2'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span
                    style={{ backgroundColor: col.cssGlow }}
                    className="w-4 h-4 rounded-full shadow-sm"
                  />
                  <span className="text-xs font-bold text-white">
                    {col.name[language]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95"
          >
            {language === 'uz' ? 'Tanlovni Tasdiqlash' : 'Confirm & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
