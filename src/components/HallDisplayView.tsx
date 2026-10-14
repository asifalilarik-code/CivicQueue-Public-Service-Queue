import React, { useState, useEffect } from 'react';
import { Counter, Token } from '../types/queue.ts';
import { SERVICE_CATEGORIES } from '../services/queueStore.ts';
import { playCallingChime } from '../utils/audioChime.ts';
import {
  Tv,
  Volume2,
  Maximize,
  Minimize,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Radio,
  Building,
  BellRing,
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext.tsx';

interface HallDisplayViewProps {
  counters: Counter[];
  waitingQueue: Token[];
  recentlyCalled: {
    token: Token;
    counterId: number;
    counterName: string;
    calledAt: number;
  }[];
}

export const HallDisplayView: React.FC<HallDisplayViewProps> = ({
  counters,
  waitingQueue,
  recentlyCalled,
}) => {
  const { language, t, isRtl } = useLanguage();
  const [clock, setClock] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const update = () => {
      const currentDate = new Date();
      setNow(Date.now());
      setClock(
        currentDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-[calc(100vh-8rem)] p-4 sm:p-8 flex flex-col justify-between select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hall TV Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-mono">
                {t('tvTitle')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('tvSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => playCallingChime()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer shadow-xs"
          >
            <BellRing className="w-4 h-4 text-emerald-400" />
            <span>Chime</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          <div className="font-mono text-xl sm:text-2xl font-black text-emerald-400 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 tracking-wider">
            {clock}
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Left 2 Cols: NOW SERVING COUNTERS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              {t('tvNowServing')}
            </h2>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              {t('hallInstruction')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {counters.map((counter) => {
              const serving = counter.currentServingToken;
              const cat = serving
                ? SERVICE_CATEGORIES[serving.serviceType] || SERVICE_CATEGORIES.GEN
                : null;
              const isOpen = counter.status === 'OPEN';

              // Check if called within last 20 seconds
              const isRecentlyCalled =
                serving?.calledAt && now - serving.calledAt < 20000;

              return (
                <div
                  key={counter.id}
                  className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between min-h-[220px] relative overflow-hidden ${
                    isOpen && serving
                      ? isRecentlyCalled
                        ? 'bg-gradient-to-b from-indigo-950 to-slate-900 border-indigo-400 ring-4 ring-indigo-500/30 shadow-2xl shadow-indigo-900/60'
                        : 'bg-slate-900 border-slate-800 shadow-xl'
                      : isOpen
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-950/40 border-slate-900 opacity-40'
                  }`}
                >
                  {isRecentlyCalled && (
                    <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-emerald-500 text-slate-950 animate-bounce">
                      JUST CALLED
                    </div>
                  )}

                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-base sm:text-lg font-black text-slate-200 tracking-wide uppercase">
                      {counter.name}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        isOpen
                          ? serving
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isOpen ? (serving ? 'NOW CALLING' : 'READY') : 'CLOSED'}
                    </span>
                  </div>

                  <div className="py-4 text-center">
                    {isOpen ? (
                      serving ? (
                        <div className="space-y-1">
                          <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
                            {serving.tokenNumber}
                          </div>
                          {cat && (
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mt-1">
                              {cat.name}
                            </div>
                          )}
                          {serving.citizenName && (
                            <div className="text-xs text-slate-400 font-semibold">
                              {serving.citizenName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-600 font-mono text-xl font-bold py-6">
                          -- STANDBY --
                        </div>
                      )
                    ) : (
                      <div className="text-slate-700 font-mono text-sm py-6">
                        Station Currently Closed
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 uppercase tracking-widest font-semibold flex items-center justify-between">
                    <span>Station #{counter.id}</span>
                    <span className="text-slate-500">{counter.categorySpecialty || 'ALL'} Desk</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: UPCOMING TOKENS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-wider text-indigo-400">
              Next Up in Queue
            </h2>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {waitingQueue.length} Waiting
            </span>
          </div>

          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3">
            {waitingQueue.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                Queue is clear. Walk up to front attendant.
              </div>
            ) : (
              <div className="space-y-2.5">
                {waitingQueue.slice(0, 6).map((tok, i) => {
                  const cat = SERVICE_CATEGORIES[tok.serviceType] || SERVICE_CATEGORIES.GEN;
                  return (
                    <div
                      key={tok.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-black text-xs">
                          #{i + 1}
                        </span>
                        <div>
                          <div className="font-mono font-black text-lg text-white">
                            {tok.tokenNumber}
                          </div>
                          <div className="text-[11px] text-slate-400">{cat.name}</div>
                        </div>
                      </div>

                      {tok.isPriority ? (
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black border border-purple-500/30">
                          PRIORITY
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono font-semibold">
                          {i === 0 ? 'Next' : `in ~${(i + 1) * 2}m`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hall TV Footer Ticker */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Keep your token receipt ready. Audio chimes will announce your counter assignment.</span>
        </div>
        <div className="font-mono text-slate-400">
          CivicQueue Dynamic $M/M/c$ System
        </div>
      </div>
    </div>
  );
};
