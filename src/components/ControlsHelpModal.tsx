/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language } from '../types/game';
import { TRANSLATIONS } from '../data/constants';
import { X, Monitor, Smartphone, Keyboard, Zap, ArrowUpCircle } from 'lucide-react';

interface ControlsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const ControlsHelpModal: React.FC<ControlsHelpModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-950/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-cyan-400" />
              <span>{t.controlsHelp}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'uz'
                ? 'Telefon va kompyuter uchun boshqaruv tugmalari'
                : 'Controls for PC / Desktop and Mobile / Touchscreens'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop PC Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Monitor className="w-4 h-4" />
            <span>{t.desktopControls}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Gaz / Tormoz:</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-[11px] font-bold">
                  W / ▲
                </kbd>
                <kbd className="px-2 py-1 rounded bg-rose-950 border border-rose-700 text-rose-300 font-mono text-[11px] font-bold">
                  S / ▼
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Rul (Chap / O‘ng):</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]">
                  A / ◄
                </kbd>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]">
                  D / ►
                </kbd>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Moshinadan tushish/minish:</span>
              <kbd className="px-3 py-1 rounded bg-amber-950 border border-amber-700 text-amber-300 font-mono text-[11px] font-bold">
                F tugmasi
              </kbd>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Choyxona / Dam olish:</span>
              <kbd className="px-3 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-[11px] font-bold">
                G tugmasi
              </kbd>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Migalka va Sirena:</span>
              <kbd className="px-3 py-1 rounded bg-rose-950 border border-blue-600 text-blue-300 font-mono text-[11px] font-bold">
                L tugmasi
              </kbd>
            </div>

            <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Faralar / Nitro / Signal:</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 rounded bg-amber-950 border border-amber-600 text-amber-300 font-mono text-[11px] font-bold">
                  K
                </kbd>
                <kbd className="px-2 py-1 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono text-[11px]">
                  Shift
                </kbd>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[11px]">
                  H
                </kbd>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-purple-300 font-mono text-[11px]">
                  C
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Phone Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>{t.mobileControls}</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0 text-xs font-bold">
                1
              </div>
              <p>
                <strong>O‘ng qo‘lda GAZ & TORMOZ:</strong> Moshina faqat{' '}
                <span className="text-emerald-300 font-bold">GAZ</span> pedali bosilganda yuradi,{' '}
                <span className="text-rose-400 font-bold">TORMOZ</span> bosilganda to‘xtaydi va orqaga yuradi.
              </p>
            </div>

            <div className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                2
              </div>
              <p>
                <strong>Moshinadan tushish & Choyxona:</strong> Yuqori o‘ngdagi{' '}
                <span className="text-amber-300 font-bold">TUSHISH</span> tugmasini bosib piyoda yuring,{' '}
                <strong>Milliy Choyxona</strong> va <strong>Dam olish Bog‘lariga</strong> kirib quvvat to‘ldiring!
              </p>
            </div>

            <div className="flex items-start gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-rose-950 border border-blue-700 text-blue-300 flex items-center justify-center shrink-0 text-xs font-bold">
                3
              </div>
              <p>
                <strong>Migalka, Sirena & GAI:</strong>{' '}
                <span className="text-rose-300 font-bold">MIGALKA</span> tugmasini yoqib chiroq/sirena chaling.
                140 km/h dan oshirsangiz <strong>YPX / GAI</strong> quvadi — tormoz bosib to‘xtang!
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
