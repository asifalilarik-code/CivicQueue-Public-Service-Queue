import React, { useState } from 'react';
import { useQueueSocket } from './hooks/useQueueSocket.ts';
import { useLanguage } from './context/LanguageContext.tsx';
import { Header, ActiveTab } from './components/Header.tsx';
import { CitizenTrackerView } from './components/CitizenTrackerView.tsx';
import { AttendantKioskView } from './components/AttendantKioskView.tsx';
import { StaffOperatorView } from './components/StaffOperatorView.tsx';
import { HallDisplayView } from './components/HallDisplayView.tsx';
import { LanguageSelectorModal } from './components/LanguageSelectorModal.tsx';
import { MultilingualHelpModal } from './components/MultilingualHelpModal.tsx';
import { Bell, ShieldCheck, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('kiosk');
  const [toastDismissed, setToastDismissed] = useState<number | null>(null);

  // Multilingual Context
  const {
    language,
    isRtl,
    t,
    showLanguageModal,
    setShowLanguageModal,
    showHelpModal,
    setShowHelpModal,
  } = useLanguage();

  // Queue WebSocket & Operations Hook
  const {
    queueState,
    analytics,
    isConnected,
    activeTokenNumber,
    activeTokenDetails,
    lastCalledAlert,
    soundEnabled,
    isCallingFlash,
    setSoundEnabled,
    issueToken,
    registerUserToken,
    clearUserToken,
    callNext,
    completeCounter,
    toggleCounter,
    cancelToken,
    recallCustomer,
    callSpecificToken,
    markNoShow,
    prioritizeToken,
    seedBatch,
    resetDemo,
  } = useQueueSocket();

  const waitingQueue = queueState?.waitingQueue || [];
  const counters = queueState?.counters || [];
  const recentlyCalled = queueState?.recentlyCalled || [];

  const isCurrentToastVisible =
    lastCalledAlert &&
    activeTab !== 'tv' &&
    toastDismissed !== lastCalledAlert.timestamp;

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Screen Calling Flash Overlay when user's ticket is called */}
      {isCallingFlash && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-emerald-500/25 animate-pulse border-8 border-emerald-500" />
      )}

      {/* Global Application Header with Language & Voice tools */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onResetDemo={resetDemo}
        onSeedBatch={seedBatch}
        activeTokenNumber={activeTokenNumber}
      />

      {/* Global Floating Calling Toast */}
      {isCurrentToastVisible && (
        <div className="fixed bottom-20 md:bottom-6 ltr:right-4 rtl:left-4 z-40 max-w-sm bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-slate-700 animate-slide-up flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                {t('ticketCalledBanner')}
              </div>
              <div className="text-sm font-black font-mono">
                {lastCalledAlert.token.tokenNumber} &rarr; {lastCalledAlert.counterName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('tv')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              {t('tabTv')}
            </button>
            <button
              onClick={() => setToastDismissed(lastCalledAlert.timestamp)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-12">
        {/* 1. Touchscreen Assisted Kiosk */}
        {activeTab === 'kiosk' && (
          <AttendantKioskView onIssueToken={issueToken} />
        )}

        {/* 2. Citizen Live Tracker */}
        {activeTab === 'tracker' && (
          <CitizenTrackerView
            activeTokenNumber={activeTokenNumber}
            activeTokenDetails={activeTokenDetails}
            onIssueToken={issueToken}
            onRegisterToken={registerUserToken}
            onClearToken={clearUserToken}
            onCancelToken={cancelToken}
            isCallingFlash={isCallingFlash}
          />
        )}

        {/* 3. Staff Operator Desk */}
        {activeTab === 'operator' && (
          <StaffOperatorView
            counters={counters}
            waitingQueue={waitingQueue}
            analytics={analytics}
            onCallNext={callNext}
            onCompleteCounter={completeCounter}
            onToggleCounter={toggleCounter}
            onCancelToken={cancelToken}
            onRecallCustomer={recallCustomer}
            onCallSpecificToken={callSpecificToken}
            onMarkNoShow={markNoShow}
            onPrioritizeToken={prioritizeToken}
          />
        )}

        {/* 4. Waiting Hall TV Display */}
        {activeTab === 'tv' && (
          <HallDisplayView
            counters={counters}
            waitingQueue={waitingQueue}
            recentlyCalled={recentlyCalled}
          />
        )}
      </main>

      {/* Accessible Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 print:hidden hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">
              CivicQueue • Multilingual Public Service Platform (English / اردو / سنڌي)
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setShowHelpModal(true)}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {t('tabHelpGuide')}
            </button>
            <button
              onClick={() => setShowLanguageModal(true)}
              className="hover:text-indigo-600 transition-colors cursor-pointer font-bold"
            >
              {language === 'sd' ? 'ٻولي تبديل ڪريو' : language === 'ur' ? 'زبان تبدیل کریں' : 'Change Language'}
            </button>
          </div>
        </div>
      </footer>

      {/* Multilingual Selector Modal */}
      <LanguageSelectorModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />

      {/* Multilingual Guidance Modal */}
      <MultilingualHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
