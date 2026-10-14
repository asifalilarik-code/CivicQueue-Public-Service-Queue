import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { SUPPORTED_LANGUAGES, Language } from '../i18n/translations.ts';
import {
  Users,
  Smartphone,
  Layers,
  Tv,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Building2,
  UserPlus,
  ChevronDown,
  Menu,
  X,
  HelpCircle,
  Languages,
} from 'lucide-react';

export type ActiveTab = 'kiosk' | 'tracker' | 'operator' | 'tv';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetDemo: () => void;
  onSeedBatch: (count?: number) => void;
  activeTokenNumber: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isConnected,
  soundEnabled,
  onToggleSound,
  onResetDemo,
  onSeedBatch,
  activeTokenNumber,
}) => {
  const {
    language,
    languageOption,
    setLanguage,
    t,
    speak,
    stopSpeaking,
    isSpeaking,
    setShowLanguageModal,
    setShowHelpModal,
    isRtl,
  } = useLanguage();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showSimMenu, setShowSimMenu] = useState<boolean>(false);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak();
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'kiosk',
      label: t('tabKiosk'),
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'tracker',
      label: t('tabTracker'),
      icon: <Smartphone className="w-4 h-4" />,
      badge: activeTokenNumber || undefined,
    },
    {
      id: 'operator',
      label: t('tabOperator'),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'tv',
      label: t('tabTv'),
      icon: <Tv className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo & Civic Branding */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTabChange('kiosk')}
                className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-all duration-200">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {t('appName')}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60 shadow-2xs">
                      v2.5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                    {t('appSubtitle')}
                  </p>
                </div>
              </button>
            </div>

            {/* Right Status / Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Multilingual Selector Button & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Switch Language / ٻولي تبديل ڪريو / زبان تبدیل کریں"
                >
                  <span className="text-base select-none">{languageOption.flag}</span>
                  <span className={`text-xs font-black ${languageOption.fontClass}`}>
                    {languageOption.nativeName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
                </button>

                {showLangMenu && (
                  <div
                    className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn"
                  >
                    <div className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {t('selectLanguage')}
                    </div>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full text-left rtl:text-right px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          language === lang.code
                            ? 'bg-indigo-50 text-indigo-700 font-black'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{lang.flag}</span>
                          <span className={lang.fontClass}>{lang.nativeName}</span>
                        </div>
                        {language === lang.code && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowLangMenu(false);
                          setShowLanguageModal(true);
                        }}
                        className="w-full text-left rtl:text-right px-3.5 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Languages className="w-3.5 h-3.5" />
                        <span>All Languages & Voice Info</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Assistance Button (for unlettered / rural citizens) */}
              <button
                onClick={handleVoiceToggle}
                title={isSpeaking ? t('stopVoice') : t('listenVoice')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  isSpeaking
                    ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-white' : 'text-amber-700'}`} />
                <span className="hidden sm:inline text-[11px] font-black">
                  {isSpeaking ? t('stopVoice') : language === 'sd' ? 'آواز' : language === 'ur' ? 'آواز' : 'Voice'}
                </span>
              </button>

              {/* Help & Guidance Button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs active:scale-95"
                title={t('tabHelpGuide')}
              >
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span className="hidden md:inline text-[11px]">
                  {language === 'sd' ? 'رهنمائي' : language === 'ur' ? 'رہنمائی' : 'Help'}
                </span>
              </button>

              {/* Audio Chime Toggle */}
              <button
                onClick={onToggleSound}
                title={soundEnabled ? 'Chime sound is active' : 'Chime sound is muted'}
                className={`p-2 rounded-xl border transition-all cursor-pointer text-xs flex items-center gap-1.5 active:scale-95 ${
                  soundEnabled
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/80'
                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Simulation Quick Tools (Available on all screen sizes) */}
              <div className="relative">
                <button
                  onClick={() => setShowSimMenu(!showSimMenu)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                  title="Demo queue simulation tools"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Demo</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showSimMenu && (
                  <div
                    className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn"
                  >
                    <button
                      onClick={() => {
                        onSeedBatch(3);
                        setShowSimMenu(false);
                      }}
                      className="w-full text-left rtl:text-right px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-500" />
                      Add 3 Rush Citizens
                    </button>
                    <button
                      onClick={() => {
                        onResetDemo();
                        setShowSimMenu(false);
                      }}
                      className="w-full text-left rtl:text-right px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-500" />
                      Reset to Clean State
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 md:hidden cursor-pointer active:scale-95"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Desktop Tab Navigation Bar */}
          <div className="hidden md:flex items-center justify-between border-t border-slate-100/90 py-2.5 overflow-x-auto no-scrollbar">
            <div className="flex space-x-1 sm:space-x-2 rtl:space-x-reverse">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-black bg-indigo-500 text-white rounded-md">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-sans font-bold text-slate-600">
                  {isConnected ? 'LIVE' : 'SYNCING'}
                </span>
              </span>
              <span>•</span>
              <span className="font-bold text-slate-600">{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3 shadow-lg">
            {/* Language Selector in Mobile Menu */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                {t('selectLanguage')}:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                      language === lang.code
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className={lang.fontClass}>{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Nav Tabs */}
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm cursor-pointer ${
                    activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-400 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}

              <button
                onClick={() => {
                  setShowHelpModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{t('tabHelpGuide')}</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
