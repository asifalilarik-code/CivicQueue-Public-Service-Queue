import React, { useState, useEffect } from 'react';
import {
  Counter,
  Token,
  QueueAnalytics,
  ServiceCategoryId,
} from '../types/queue.ts';
import { SERVICE_CATEGORIES } from '../services/queueStore.ts';
import { formatWaitTime } from '../services/calculator.ts';
import {
  Users,
  Clock,
  Play,
  CheckCircle2,
  Power,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  Building,
  ArrowRight,
  Flame,
  Timer,
  ChevronRight,
  HelpCircle,
  FileCheck,
  CreditCard,
  Award,
  HeartHandshake,
  BellRing,
  UserX,
  Search,
  Filter,
  ArrowUp,
  ShieldAlert,
  X,
  UserPlus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface StaffOperatorViewProps {
  counters: Counter[];
  waitingQueue: Token[];
  analytics: QueueAnalytics | null;
  onCallNext: (counterId: number) => Promise<any>;
  onCompleteCounter: (counterId: number) => Promise<any>;
  onToggleCounter: (counterId: number, status?: 'OPEN' | 'CLOSED') => Promise<any>;
  onCancelToken: (tokenNumber: string) => Promise<any>;
  onRecallCustomer?: (counterId: number) => Promise<any>;
  onCallSpecificToken?: (counterId: number, tokenNumber: string) => Promise<any>;
  onMarkNoShow?: (counterId: number) => Promise<any>;
  onPrioritizeToken?: (tokenNumber: string) => Promise<any>;
}

export const StaffOperatorView: React.FC<StaffOperatorViewProps> = ({
  counters,
  waitingQueue,
  analytics,
  onCallNext,
  onCompleteCounter,
  onToggleCounter,
  onCancelToken,
  onRecallCustomer,
  onCallSpecificToken,
  onMarkNoShow,
  onPrioritizeToken,
}) => {
  const { language, t, isRtl } = useLanguage();
  const [loadingCounterId, setLoadingCounterId] = useState<number | null>(null);
  const [counterToClose, setCounterToClose] = useState<Counter | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [callSpecificModal, setCallSpecificModal] = useState<{
    counterId: number;
    tokenNumber: string;
  } | null>(null);

  // Timer tick for service duration counters
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleCall = async (counterId: number) => {
    try {
      setLoadingCounterId(counterId);
      const res = await onCallNext(counterId);
      if (res?.calledToken) {
        showFeedback('success', `Called token ${res.calledToken.tokenNumber} to Counter ${counterId}`);
      } else {
        showFeedback('info', 'No waiting citizens in queue');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error calling next customer');
    } finally {
      setLoadingCounterId(null);
    }
  };

  const handleComplete = async (counterId: number) => {
    try {
      setLoadingCounterId(counterId);
      await onCompleteCounter(counterId);
      showFeedback('success', `Completed service at Counter ${counterId}`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Error completing customer');
    } finally {
      setLoadingCounterId(null);
    }
  };

  const handleRecall = async (counterId: number) => {
    if (!onRecallCustomer) return;
    try {
      setLoadingCounterId(counterId);
      await onRecallCustomer(counterId);
      showFeedback('success', `Bell re-chimed for Counter ${counterId}`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Error recalling customer');
    } finally {
      setLoadingCounterId(null);
    }
  };

  const handleNoShow = async (counterId: number) => {
    if (!onMarkNoShow) return;
    try {
      setLoadingCounterId(counterId);
      await onMarkNoShow(counterId);
      showFeedback('info', `Customer marked as absent / skipped`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Error marking no-show');
    } finally {
      setLoadingCounterId(null);
    }
  };

  const handleConfirmClose = async () => {
    if (!counterToClose) return;
    try {
      setLoadingCounterId(counterToClose.id);
      await onToggleCounter(counterToClose.id, 'CLOSED');
      showFeedback('info', `Station ${counterToClose.name} closed`);
      setCounterToClose(null);
    } catch (err: any) {
      showFeedback('error', err.message || 'Error closing counter');
    } finally {
      setLoadingCounterId(null);
    }
  };

  const handleToggleClick = async (counter: Counter) => {
    if (counter.status === 'OPEN') {
      if (counter.currentServingToken) {
        // Show clean modal dialog
        setCounterToClose(counter);
        return;
      }
      // If idle, close directly
      try {
        setLoadingCounterId(counter.id);
        await onToggleCounter(counter.id, 'CLOSED');
      } finally {
        setLoadingCounterId(null);
      }
    } else {
      // Open directly
      try {
        setLoadingCounterId(counter.id);
        await onToggleCounter(counter.id, 'OPEN');
      } finally {
        setLoadingCounterId(null);
      }
    }
  };

  const formatElapsed = (startedAt: number | null) => {
    if (!startedAt) return '00:00';
    const elapsedSec = Math.max(0, Math.floor((now - startedAt) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (startedAt: number | null) => {
    if (!startedAt) return 'text-slate-600 bg-slate-50';
    const elapsedSec = Math.floor((now - startedAt) / 1000);
    if (elapsedSec < 120) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (elapsedSec < 300) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse';
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'GEN':
        return <HelpCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'DOC':
        return <FileCheck className="w-3.5 h-3.5 text-indigo-500" />;
      case 'CSH':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-500" />;
      case 'LIC':
        return <Award className="w-3.5 h-3.5 text-amber-500" />;
      case 'PRI':
        return <HeartHandshake className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return null;
    }
  };

  // Filtered queue
  const filteredQueue = waitingQueue.filter((tok) => {
    const matchesCat = categoryFilter === 'ALL' || tok.serviceType === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      tok.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tok.citizenName && tok.citizenName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Real-time Operator Action Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                feedback.type === 'success'
                  ? 'bg-emerald-500'
                  : feedback.type === 'error'
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
            />
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-black/5 cursor-pointer text-slate-500"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Operational Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Counters */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Staffed Counters</span>
            <Building className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {analytics ? analytics.activeCounterCount : 0}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              of {counters.length} open
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live service throughput
          </div>
        </div>

        {/* Current Queue Depth */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Queue Depth</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {waitingQueue.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">citizens in line</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            {waitingQueue.length > 5 ? (
              <span className="text-amber-600 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Peak flow active
              </span>
            ) : (
              'Optimal flow rate'
            )}
          </div>
        </div>

        {/* Customers Served Today */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Served Today</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {analytics ? analytics.totalServedToday : 0}
            </span>
            <span className="text-xs font-semibold text-slate-400">completed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            ~{analytics?.totalThroughputPerHour || 0} completions / hr
          </div>
        </div>

        {/* Live Facility Average Wait Time */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Live Facility Wait</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {analytics ? formatWaitTime(analytics.avgWaitTimeSec) : '~3 min'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Dynamic EWMA facility average
          </div>
        </div>
      </div>

      {/* Main Working Area: Counters Grid & Waiting Queue Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Individual Counter Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Service Counter Stations
              </h2>
              <p className="text-xs text-slate-500">
                Independent counter calling, active service timers, and EWMA calibration
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {counters.filter((c) => c.status === 'OPEN').length} active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {counters.map((counter) => {
              const isOpen = counter.status === 'OPEN';
              const isServing = Boolean(counter.currentServingToken);
              const servingToken = counter.currentServingToken;
              const cat = servingToken
                ? SERVICE_CATEGORIES[servingToken.serviceType] || SERVICE_CATEGORIES.GEN
                : null;
              const isLoading = loadingCounterId === counter.id;

              return (
                <div
                  key={counter.id}
                  className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                    isOpen
                      ? 'border-slate-200/90 hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50/70 opacity-80'
                  }`}
                >
                  {/* Counter Top Bar */}
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-slate-900">{counter.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {counter.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Specialty: {counter.categorySpecialty || 'ALL'} Desk
                      </p>
                    </div>

                    {/* Toggle Button */}
                    <button
                      disabled={isLoading}
                      onClick={() => handleToggleClick(counter)}
                      title={isOpen ? 'Close Counter (returns customer to top of line)' : 'Open Counter'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isOpen
                          ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {isOpen ? 'Close' : 'Open'}
                    </button>
                  </div>

                  {/* Serving Card Body */}
                  <div className="p-5 space-y-4">
                    {isOpen ? (
                      isServing && servingToken ? (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-400 uppercase tracking-wider text-[10px]">
                              Active Citizen
                            </span>
                            <div
                              className={`flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border ${getTimerColor(
                                counter.serviceStartedAt
                              )}`}
                            >
                              <Timer className="w-3.5 h-3.5" />
                              {formatElapsed(counter.serviceStartedAt)}
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <div className="text-4xl font-black font-mono tracking-tight text-slate-950">
                              {servingToken.tokenNumber}
                            </div>
                            {cat && (
                              <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                {cat.name}
                              </span>
                            )}
                          </div>

                          {servingToken.citizenName && (
                            <div className="text-xs text-slate-600 font-medium">
                              Citizen: <strong className="text-slate-900">{servingToken.citizenName}</strong>
                            </div>
                          )}

                          {/* Quick Staff Micro-Actions: Recall Chime & Mark No-Show */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                            <button
                              onClick={() => handleRecall(counter.id)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                              title="Ring audio bell again"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              Re-Chime Bell
                            </button>
                            <button
                              onClick={() => handleNoShow(counter.id)}
                              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                              title="Mark citizen absent"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              No-Show / Skip
                            </button>
                          </div>

                          {/* Action Buttons for Active Customer */}
                          <div className="pt-2 flex gap-2">
                            <button
                              disabled={isLoading}
                              onClick={() => handleComplete(counter.id)}
                              className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Finish Ticket
                            </button>
                            <button
                              disabled={isLoading || waitingQueue.length === 0}
                              onClick={() => handleCall(counter.id)}
                              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Next Citizen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3">
                          <div className="text-slate-400 text-xs font-medium">Counter Idle — Ready for Next Citizen</div>
                          <button
                            disabled={isLoading || waitingQueue.length === 0}
                            onClick={() => handleCall(counter.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 mx-auto transition-all cursor-pointer ${
                              waitingQueue.length > 0
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Play className="w-4 h-4" />
                            {waitingQueue.length > 0
                              ? `Call Next Customer (${waitingQueue.length} in line)`
                              : 'Waiting Queue is Empty'}
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="py-8 text-center bg-slate-100/60 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                        Counter is currently closed.
                        <div className="text-[11px] text-slate-400 mt-1">
                          Click "Open" to start processing citizens.
                        </div>
                      </div>
                    )}

                    {/* Counter Speed & EWMA Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-100 text-xs text-slate-500">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          EWMA Speed
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          ~{counter.avgServiceDurationSec || 120}s / ticket
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Served Today
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {counter.completedCount} citizens
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Live Waiting Queue Monitor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Live Waiting Queue
              </h2>
              <p className="text-xs text-slate-500">
                Sorted by priority & arrival order
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-black">
              {waitingQueue.length} In Line
            </span>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token e.g. GEN-102 or name..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {['ALL', 'GEN', 'DOC', 'CSH', 'LIC', 'PRI'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No matching tickets</p>
                <p className="text-xs text-slate-400">
                  {waitingQueue.length === 0 ? 'All queues are cleared!' : 'Try adjusting your search filter.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
                {filteredQueue.map((tok, index) => {
                  const cat = SERVICE_CATEGORIES[tok.serviceType] || SERVICE_CATEGORIES.GEN;
                  const waitSec = Math.max(0, Math.floor((now - tok.createdAt) / 1000));
                  const isLongWait = waitSec > 600;

                  return (
                    <div
                      key={tok.id}
                      className={`p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                        tok.isPriority ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      {/* Position & Token */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                            index < 2
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{index + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-sm sm:text-base text-slate-900">
                              {tok.tokenNumber}
                            </span>
                            {getCategoryIcon(tok.serviceType)}
                            {tok.isPriority && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black rounded-sm">
                                PRIORITY
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[150px]">
                            <span>{tok.citizenName || cat.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Wait Time & Actions */}
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div
                            className={`text-xs font-mono font-bold flex items-center justify-end gap-1 ${
                              isLongWait ? 'text-rose-600' : 'text-slate-600'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {Math.floor(waitSec / 60)}m {waitSec % 60}s
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            {onPrioritizeToken && !tok.isPriority && (
                              <button
                                onClick={() => onPrioritizeToken(tok.tokenNumber)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Fast-track to front"
                              >
                                <ArrowUp className="w-3 h-3" />
                                Boost
                              </button>
                            )}
                            <button
                              onClick={() => onCancelToken(tok.tokenNumber)}
                              className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close Counter Confirmation Modal */}
      {counterToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-lg">Close {counterToClose.name}?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Active customer <strong>{counterToClose.currentServingToken?.tokenNumber}</strong> will be safely returned to the top of the queue for the next available counter.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCounterToClose(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Open
              </button>
              <button
                onClick={handleConfirmClose}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close Station
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
