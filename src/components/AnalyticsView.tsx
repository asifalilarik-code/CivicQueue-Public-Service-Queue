import React, { useState } from 'react';
import { QueueAnalytics, Counter, ServiceCategoryId } from '../types/queue.ts';
import { SERVICE_CATEGORIES } from '../services/queueStore.ts';
import { formatWaitTime, calculateErlangC } from '../services/calculator.ts';
import {
  BarChart3,
  TrendingUp,
  Cpu,
  Layers,
  Clock,
  Users,
  Activity,
  Flame,
  CheckCircle2,
  HelpCircle,
  Calculator,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AnalyticsViewProps {
  analytics: QueueAnalytics | null;
  counters: Counter[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics, counters }) => {
  // Interactive Simulator State
  const [simServers, setSimServers] = useState<number>(3);
  const [simServiceSec, setSimServiceSec] = useState<number>(90);
  const [simArrivalRateMin, setSimArrivalRateMin] = useState<number>(1.8);

  if (!analytics) {
    return (
      <div className="py-16 text-center text-slate-500 font-medium">
        Loading mathematical queuing engine...
      </div>
    );
  }

  const mmc = analytics.mmcStats;

  // Compute live simulated Erlang-C result
  const simMuPerSec = 1 / Math.max(10, simServiceSec);
  const simLambdaPerSec = simArrivalRateMin / 60;
  const simResult = calculateErlangC(simServers, simLambdaPerSec, simMuPerSec);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-indigo-500/30">
            <Calculator className="w-3.5 h-3.5" />
            Queuing Theory Architecture ($M/M/c$)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dynamic Waiting-Time & Queuing Engine
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Real-time multi-server Markovian queuing model with Exponentially Weighted Moving
            Average (EWMA) completion rates and dynamic aggregate throughput calculation.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 shrink-0 text-center">
          <span className="text-[11px] uppercase tracking-wider text-slate-300 block font-bold">
            Live Facility Utilization ($\rho$)
          </span>
          <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-1 block">
            {(mmc.utilizationRho * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-1 font-semibold">
            {mmc.utilizationRho < 0.75
              ? 'Stable / Fluid Flow'
              : mmc.utilizationRho < 0.9
              ? 'Heavy Traffic'
              : 'Near Saturation Point'}
          </span>
        </div>
      </div>

      {/* Interactive M/M/c Capacity Simulator Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-black tracking-tight text-white">
                Interactive $M/M/c$ Capacity Simulator
              </h2>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Experiment with counter staffing, transaction speeds, and peak citizen inflow to project wait times.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-black uppercase tracking-wider self-start sm:self-auto">
            Live Math Sandbox
          </span>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Active Counters (c) */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-200">
              <span>Active Counters (c)</span>
              <span className="text-white font-mono text-base font-black">{simServers} counters</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={simServers}
              onChange={(e) => setSimServers(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-indigo-300">
              <span>1 counter</span>
              <span>8 counters</span>
            </div>
          </div>

          {/* Slider 2: Average Service Time (T = 1/mu) */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-200">
              <span>Avg Duration (1/&mu;)</span>
              <span className="text-white font-mono text-base font-black">{simServiceSec}s / ticket</span>
            </div>
            <input
              type="range"
              min="30"
              max="300"
              step="15"
              value={simServiceSec}
              onChange={(e) => setSimServiceSec(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-indigo-300">
              <span>30s (fast)</span>
              <span>300s (slow)</span>
            </div>
          </div>

          {/* Slider 3: Arrival Rate (lambda) */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-200">
              <span>Arrival Rate (&lambda;)</span>
              <span className="text-white font-mono text-base font-black">{simArrivalRateMin} citizens / min</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="8.0"
              step="0.1"
              value={simArrivalRateMin}
              onChange={(e) => setSimArrivalRateMin(parseFloat(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-indigo-300">
              <span>0.5 / min</span>
              <span>8.0 / min (rush)</span>
            </div>
          </div>
        </div>

        {/* Simulator Outputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
              Projected Traffic (&rho;)
            </span>
            <span
              className={`text-2xl font-black font-mono mt-1 block ${
                simResult.utilization >= 1.0
                  ? 'text-rose-400'
                  : simResult.utilization > 0.8
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {(simResult.utilization * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-indigo-200 mt-0.5 block">
              {simResult.utilization >= 1.0 ? 'System overloaded' : 'Sustainable capacity'}
            </span>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
              Erlang-C Delay Probability (P_W)
            </span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">
              {(simResult.erlangCProbability * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-indigo-200 mt-0.5 block">
              Chance citizen must wait
            </span>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
              Theoretical Queue Wait (W_q)
            </span>
            <span className="text-2xl font-black font-mono text-amber-300 mt-1 block">
              {simResult.utilization >= 1.0 ? '&infin; (Infinite)' : formatWaitTime(simResult.theoreticalWaitSec)}
            </span>
            <span className="text-[11px] text-indigo-200 mt-0.5 block">
              Expected wait in line
            </span>
          </div>
        </div>
      </div>

      {/* Mathematical Formulas Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-600" />
          Active Mathematical Models & Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formula 1 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              1. Rolling Service Throughput (EWMA)
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 text-center font-bold">
              {'μ_t = α · μ_recent + (1 - α) · μ_{t-1}'}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Smoothing constant <strong className="font-mono text-indigo-700 font-bold">&alpha; = 0.25</strong>.{' '}
              Updates completion rate after each transaction duration without being skewed by single anomalous transactions.
            </p>
          </div>

          {/* Formula 2 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              2. Dynamic Aggregate Wait Time
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 text-center font-bold">
              {'Estimated Wait = p / Σ(μ_i)'}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Where <strong className="font-mono">p</strong> is the token's queue position and{' '}
              <strong className="font-mono">c</strong> is the count of active counters. Recalculates dynamically on staff toggles.
            </p>
          </div>

          {/* Formula 3 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              3. Erlang-C Delay Probability
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 text-center font-bold">
              {'P_W = [(c·ρ)^c / c!(1-ρ)] / [Σ(c·ρ)^k/k! + (c·ρ)^c/c!(1-ρ)]'}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Theoretical probability an arriving citizen must queue. Current probability is{' '}
              <strong className="font-mono text-slate-900 font-bold">
                {(mmc.erlangCWaitProbability * 100).toFixed(1)}%
              </strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Counters EWMA Speed Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-2xs">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Individual Counter Throughput & EWMA Calibration
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-bold">Counter</th>
                <th className="pb-3 font-bold">Status</th>
                <th className="pb-3 font-bold">Specialty</th>
                <th className="pb-3 font-bold">Current &mu; (Rate)</th>
                <th className="pb-3 font-bold">Avg Service Time</th>
                <th className="pb-3 font-bold">Served Total</th>
                <th className="pb-3 font-bold">Est. Hourly Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {counters.map((c) => {
                const isOpen = c.status === 'OPEN';
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          isOpen
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{c.categorySpecialty || 'ALL'}</td>
                    <td className="py-3.5 font-mono font-bold text-slate-800">
                      {(c.mu * 60).toFixed(2)} / min
                    </td>
                    <td className="py-3.5 font-mono font-semibold text-slate-700">
                      ~{c.avgServiceDurationSec}s
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{c.completedCount}</td>
                    <td className="py-3.5 font-mono text-emerald-600 font-bold">
                      {isOpen ? Math.round(c.mu * 3600) : 0} citizens/hr
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Volume Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-2xs">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Service Category Distribution & Bottlenecks
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(analytics.categoryStats).map(([catId, stat]) => {
            const cat =
              SERVICE_CATEGORIES[catId as keyof typeof SERVICE_CATEGORIES] || SERVICE_CATEGORIES.GEN;
            return (
              <div
                key={catId}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-center"
              >
                <span className="font-mono text-xs font-black px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                  {cat.prefix}
                </span>
                <h4 className="font-bold text-slate-900 text-xs mt-1">{cat.name}</h4>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {stat.totalIssued}
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 font-medium">
                  <div>Waiting: {stat.waiting}</div>
                  <div>Completed: {stat.completed}</div>
                  <div className="text-indigo-600 font-bold">
                    Avg: {formatWaitTime(stat.avgWaitSec || cat.baseDurationSec)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
