import React, { useState, useEffect } from 'react';
import { ServiceCategoryId, Token, WaitEstimate } from '../types/queue.ts';
import { TicketSlipModal } from './TicketSlipModal.tsx';
import { playCallingChime } from '../utils/audioChime.ts';
import { validateCNIC, validatePhone, formatCNICInput, formatPhoneInput } from '../utils/security.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  HelpCircle,
  HeartHandshake,
  User,
  ShieldCheck,
  Printer,
  Eye,
  Clock,
  Sparkles,
  Zap,
  Phone,
  CreditCard,
  Volume2,
  VolumeX,
  X,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

interface AttendantKioskViewProps {
  onIssueToken: (
    serviceType: ServiceCategoryId,
    citizenName?: string,
    isPriority?: boolean,
    extraData?: { cnic?: string; phone?: string }
  ) => Promise<any>;
}

interface AssistanceFlag {
  id: string;
  en: string;
  ur: string;
  sd: string;
  icon: string;
}

const ASSISTANCE_FLAGS: AssistanceFlag[] = [
  {
    id: 'senior',
    en: 'Senior Citizen (65+)',
    ur: 'بزرگ شہری (65+)',
    sd: 'بزرگ شهري (65+)',
    icon: '👴',
  },
  {
    id: 'wheelchair',
    en: 'Wheelchair / Disability',
    ur: 'معذور افراد / وہیل چیئر',
    sd: 'معذور ماڻهو / ويل چيئر',
    icon: '♿',
  },
  {
    id: 'expectant',
    en: 'Expectant / Child Care',
    ur: 'حاملہ خواتین / چھوٹے بچے',
    sd: 'اميدوار عورتون / ننڍا ٻار',
    icon: '🤰',
  },
  {
    id: 'language',
    en: 'Language & Reading Help',
    ur: 'پڑھنے لکھنے میں مدد',
    sd: 'پڙهڻ لکڻ ۾ مدد جي ضرورت',
    icon: '📖',
  },
];

interface KioskCategory {
  id: ServiceCategoryId;
  prefix: string;
  enTitle: string;
  urTitle: string;
  sdTitle: string;
  enDesc: string;
  urDesc: string;
  sdDesc: string;
  estWait: string;
  isPriorityLane?: boolean;
}

const KIOSK_CATEGORIES: KioskCategory[] = [
  {
    id: 'GEN',
    prefix: 'GEN',
    enTitle: 'General Inquiries',
    urTitle: 'عام رہنمائی و معلومات',
    sdTitle: 'عام پڇا ڳاڇا ۽ معلومات',
    enDesc: 'Information desk, forms & basic guidance',
    urDesc: 'عمومی معلومات، فارمز اور رہنمائی کاؤنٹر',
    sdDesc: 'عام معلومات، فارم ۽ بنيادي رهنمائي',
    estWait: '~2m',
  },
  {
    id: 'DOC',
    prefix: 'DOC',
    enTitle: 'Document Attestation',
    urTitle: 'دستاویزات کی تصدیق',
    sdTitle: 'دستاويزن ۽ ڪاغذن جي تصديق',
    enDesc: 'Notary seals, certificate stamps & verification',
    urDesc: 'کاغذات، اسناد اور سرٹیفکیٹ کی تصدیق',
    sdDesc: 'ڪاغذن، اسناد ۽ سرٽيفڪيٽن جي تصديق',
    estWait: '~3m',
  },
  {
    id: 'CSH',
    prefix: 'CSH',
    enTitle: 'Cashier & Payments',
    urTitle: 'کیش اور فیس ادائیگی',
    sdTitle: 'ڪيش ۽ فيس جمع ڪرائڻ',
    enDesc: 'Treasury deposits, challan clearance & fee counter',
    urDesc: 'سرکاری فیس، چالان اور نقد ادائیگیاں',
    sdDesc: 'سرڪاري فيس، چالان ۽ نقد رقم جي ادائيگي',
    estWait: '~1m',
  },
  {
    id: 'LIC',
    prefix: 'LIC',
    enTitle: 'Permits & Licensing',
    urTitle: 'لائسنس اور پرمٹ سروسز',
    sdTitle: 'لائسنس ۽ پرمٽ جون خدمتون',
    enDesc: 'Driving permits, renewals & trade licenses',
    urDesc: 'ڈرائیونگ لائسنس، تجارتی پرمٹ اور تجدید',
    sdDesc: 'ڊرائيونگ لائسنس، ڪاروباري پرمٽ ۽ نئين سر جاري ڪرڻ',
    estWait: '~3m',
  },
  {
    id: 'PRI',
    prefix: 'PRI',
    enTitle: 'Express Priority Lane',
    urTitle: 'ایکسپریس ترجیحی قطار',
    sdTitle: 'ايڪسپريس ترجيحي قطار',
    enDesc: 'Fast-track priority counter for urgent citizen care',
    urDesc: 'فوری سہولت کاؤنٹر برائے معذور و بزرگ افراد',
    sdDesc: 'تڪڙي سروس ڪائونٽر بزرگن ۽ خاص ماڻهن لاءِ',
    estWait: 'Instant (~1m)',
    isPriorityLane: true,
  },
];

export const AttendantKioskView: React.FC<AttendantKioskViewProps> = ({ onIssueToken }) => {
  const { language, t, speak, isSpeaking, stopSpeaking, isRtl, setShowHelpModal } = useLanguage();

  // Assistance flags state
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [directPrintMode, setDirectPrintMode] = useState<boolean>(false);

  // 2-second debounce / lock state
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockCountdown, setLockCountdown] = useState<number>(0);

  // Personal Info Dialog State (CNIC / Mobile / Name)
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<KioskCategory | null>(null);
  const [citizenName, setCitizenName] = useState<string>('');
  const [cnicInput, setCnicInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Issued ticket slip
  const [issuedTicket, setIssuedTicket] = useState<{
    token: Token;
    estimate: WaitEstimate;
  } | null>(null);
  const [lastIssuedNumber, setLastIssuedNumber] = useState<string | null>(null);
  const [totalKioskIssued, setTotalKioskIssued] = useState<number>(24);

  // Countdown timer for 2s lock
  useEffect(() => {
    let timer: any;
    if (lockCountdown > 0) {
      timer = setTimeout(() => {
        setLockCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setIsLocked(false);
    }
    return () => clearTimeout(timer);
  }, [lockCountdown]);

  const toggleFlag = (flagId: string) => {
    setSelectedFlags((prev) =>
      prev.includes(flagId) ? prev.filter((id) => id !== flagId) : [...prev, flagId]
    );
  };

  const handleCategoryTouch = (cat: KioskCategory) => {
    if (isLocked) return;

    if (soundActive) {
      playCallingChime();
    }

    if (directPrintMode) {
      executeIssueTicket(cat, true);
    } else {
      setSelectedCategoryForModal(cat);
    }
  };

  const handleVoiceKioskGuide = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (language === 'ur') {
      speak('کیوسک پر خوش آمدید۔ ٹوکن حاصل کرنے کے لیے سروس کے بٹن کو دبائیں۔ اگر آپ بزرگ ہیں یا معذور ہیں تو اوپر والا رعایت کا بٹن دبائیں۔');
    } else if (language === 'sd') {
      speak('ڪيوسڪ ۾ ڀلي ڪري آيا. ٽوڪن وٺڻ لاءِ پنهنجي گهربل سروس جو بٽڻ دٻايو. بزرگ ۽ معذور شهري مٿيون نيرو بٽڻ دٻائين.');
    } else {
      speak('Welcome to the check-in terminal. Touch any service button to get your ticket. Select assistance flags at the top for priority service.');
    }
  };

  const executeIssueTicket = async (cat: KioskCategory | null, skipInfo: boolean = false) => {
    if (!cat) return;
    try {
      if (!skipInfo && cnicInput.trim()) {
        const cleanCnic = cnicInput.replace(/\D/g, '');
        if (cleanCnic.length > 0 && cleanCnic.length !== 13) {
          setCnicError(
            language === 'ur'
              ? 'براہ کرم درست 13 ہندسوں کا شناختی کارڈ درج کریں (مثال: 35201-1234567-9)'
              : language === 'sd'
              ? 'مهرباني ڪري درست 13 انگن جو شناختي ڪارڊ داخل ڪريو (مثال: 35201-1234567-9)'
              : 'Please enter a valid 13-digit CNIC (e.g. 35201-1234567-9)'
          );
          return;
        }
      }
      if (!skipInfo && phoneInput.trim()) {
        const cleanPhone = phoneInput.replace(/\D/g, '');
        if (cleanPhone.length > 0 && (cleanPhone.length < 10 || cleanPhone.length > 12)) {
          setPhoneError(
            language === 'ur'
              ? 'براہ کرم درست موبائل نمبر درج کریں (مثال: 0300-1234567)'
              : language === 'sd'
              ? 'مهرباني ڪري درست موبائل نمبر لکو (مثال: 0300-1234567)'
              : 'Please enter a valid mobile number (e.g. 0300-1234567)'
          );
          return;
        }
      }

      setIsLocked(true);
      setLockCountdown(2);

      if (soundActive) {
        playCallingChime();
      }

      const activeFlagLabels = selectedFlags
        .map((fId) => {
          const f = ASSISTANCE_FLAGS.find((item) => item.id === fId);
          return f ? (language === 'ur' ? f.ur : language === 'sd' ? f.sd : f.en) : null;
        })
        .filter(Boolean) as string[];

      const hasPriorityFlag = selectedFlags.length > 0 || cat.id === 'PRI';
      const finalCategory: ServiceCategoryId = hasPriorityFlag ? 'PRI' : cat.id;

      let ticketData: any = null;

      try {
        const res = await fetch('/api/kiosk/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: finalCategory,
            flags: activeFlagLabels,
            citizenName: skipInfo ? undefined : citizenName.trim() || undefined,
            cnic: skipInfo ? undefined : cnicInput.trim() || undefined,
            phone: skipInfo ? undefined : phoneInput.trim() || undefined,
          }),
        });

        if (res.ok) {
          ticketData = await res.json();
        }
      } catch (networkErr) {
        console.warn('POST /api/kiosk/issue failed, will attempt fallback:', networkErr);
      }

      // Fallback through onIssueToken prop if needed
      if (!ticketData) {
        const fallbackRes = await onIssueToken(
          finalCategory,
          skipInfo ? undefined : citizenName.trim() || undefined,
          hasPriorityFlag,
          {
            cnic: skipInfo ? undefined : cnicInput.trim() || undefined,
            phone: skipInfo ? undefined : phoneInput.trim() || undefined,
          }
        );
        if (fallbackRes) {
          ticketData = {
            token: fallbackRes.token,
            estimate: fallbackRes.estimate,
            tokenNumber: fallbackRes.token?.tokenNumber,
          };
        }
      }

      if (ticketData?.token) {
        setIssuedTicket({
          token: ticketData.token,
          estimate: ticketData.estimate,
        });
        setLastIssuedNumber(ticketData.tokenNumber || ticketData.token.tokenNumber);
        setTotalKioskIssued((prev) => prev + 1);

        setSelectedFlags([]);
        setSelectedCategoryForModal(null);
        setCitizenName('');
        setCnicInput('');
        setPhoneInput('');
        setCnicError(null);
        setPhoneError(null);
      }
    } catch (err) {
      console.error('Error issuing kiosk ticket:', err);
    } finally {
      setTimeout(() => {
        setIsLocked(false);
      }, 2000);
    }
  };

  const isAnyFlagActive = selectedFlags.length > 0;

  return (
    <div
      className={`max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-6 ${
        highContrast ? 'bg-black text-white min-h-screen' : ''
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* 1. Kiosk Top Banner */}
      <div
        className={`p-5 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border transition-all ${
          highContrast
            ? 'bg-black text-white border-white'
            : 'bg-slate-950 text-white border-slate-800'
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                highContrast
                  ? 'bg-yellow-400 text-black'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('tabKiosk')}
            </span>

            {/* Voice Guidance Button */}
            <button
              onClick={handleVoiceKioskGuide}
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? t('stopVoice') : t('listenVoice')}</span>
            </button>

            {/* High Contrast Mode Toggle */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-slate-300"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{highContrast ? 'Standard UI' : 'High Contrast'}</span>
            </button>

            {/* 1-Touch Direct Print vs CNIC Input Mode Toggle */}
            <button
              type="button"
              onClick={() => setDirectPrintMode(!directPrintMode)}
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                directPrintMode
                  ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300/40'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
              title="Toggle 1-Touch Instant Print or CNIC details modal"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {directPrintMode
                  ? language === 'sd'
                    ? '⚡ 1-ٽچ فوري ٽوڪن'
                    : language === 'ur'
                    ? '⚡ 1-ٹچ فوری ٹوکن'
                    : '⚡ 1-Touch Instant'
                  : language === 'sd'
                  ? '📝 شناختي ڪارڊ'
                  : language === 'ur'
                  ? '📝 شناختی کارڈ موڈ'
                  : '📝 Ask CNIC Mode'}
              </span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>{t('categoriesTitle')}</span>
            {isLocked && (
              <span className="text-xs bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                <Lock className="w-3 h-3" /> ({lockCountdown}s)
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {language === 'ur'
              ? 'بزرگ شہریوں اور دیہاتی بھائیوں کے لیے آسان 1-ٹچ ٹوکن سسٹم۔ ٹوکن پرنٹ کرنے کے لیے نیچے بٹن دبائیں۔'
              : language === 'sd'
              ? 'بزرگ شهرين ۽ ڳوٺاڻن ماڻهن لاءِ آسان 1-ٽچ ٽوڪن سسٽم. ٽوڪن پرنٽ ڪرڻ لاءِ هيٺ ڏنل بٽڻ تي ٽچ ڪريو.'
              : 'Fast 1-touch ticketing for elderly, disabled, or walk-in citizens. Touch a service button to enter details and print your slip.'}
          </p>
        </div>

        {/* Counter and Last Token Stats */}
        <div className="flex items-center gap-3 shrink-0">
          {lastIssuedNumber && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-3 border ${
                highContrast
                  ? 'bg-slate-900 border-white text-white'
                  : 'bg-slate-900/90 border-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  {language === 'sd' ? 'تازو ٽوڪن' : language === 'ur' ? 'آخری ٹوکن' : 'Last Token'}
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {lastIssuedNumber}
                </span>
              </div>
            </div>
          )}
          <div className="text-right hidden sm:block pl-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {t('todayTotalTokens')}
            </span>
            <span className="text-2xl font-black font-mono text-white">
              {totalKioskIssued}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Assistance Flags (Priority Toggles) */}
      <div
        className={`p-5 rounded-3xl border shadow-xs transition-all ${
          highContrast
            ? 'bg-slate-950 border-white text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
              {t('priorityFlagsTitle')}
            </h2>
          </div>
          {isAnyFlagActive ? (
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {t('priorityActiveBadge')} ({selectedFlags.length})
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-semibold">
              {t('standardQueueBadge')}
            </span>
          )}
        </div>

        {/* 4 Flag Toggles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ASSISTANCE_FLAGS.map((flag) => {
            const isSelected = selectedFlags.includes(flag.id);
            const flagLabel = language === 'ur' ? flag.ur : language === 'sd' ? flag.sd : flag.en;
            return (
              <button
                key={flag.id}
                type="button"
                onClick={() => toggleFlag(flag.id)}
                className={`p-4 rounded-2xl border-2 text-left rtl:text-right transition-all duration-150 cursor-pointer flex items-center gap-3.5 min-h-[64px] active:scale-98 select-none ${
                  isSelected
                    ? highContrast
                      ? 'bg-yellow-400 text-black border-yellow-300 font-black shadow-lg'
                      : 'bg-purple-700 text-white border-purple-800 shadow-md ring-2 ring-purple-400/50'
                    : highContrast
                    ? 'bg-black text-white border-slate-700 hover:border-white'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl shrink-0">{flag.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm sm:text-base leading-tight">
                    {flagLabel}
                  </div>
                  <div
                    className={`text-xs font-medium truncate ${
                      isSelected
                        ? highContrast
                          ? 'text-slate-900'
                          : 'text-purple-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {language === 'sd' ? 'ترجيحي سهولت' : language === 'ur' ? 'ترجیحی سہولت' : 'Priority Care'}
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? highContrast
                        ? 'bg-black text-yellow-400 border-black'
                        : 'bg-white text-purple-700 border-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <span className="font-black text-xs">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 1-Touch Category Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              {t('categoriesTitle')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('buttonCooldownNotice')}
            </p>
          </div>
          {isLocked && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              {lockCountdown}s
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {KIOSK_CATEGORIES.map((cat) => {
            const isPriorityButton = cat.id === 'PRI' || isAnyFlagActive;
            const categoryTitle = language === 'ur' ? cat.urTitle : language === 'sd' ? cat.sdTitle : cat.enTitle;
            const categoryDesc = language === 'ur' ? cat.urDesc : language === 'sd' ? cat.sdDesc : cat.enDesc;

            let bgStyle = '';
            if (highContrast) {
              bgStyle = isPriorityButton
                ? 'bg-yellow-400 text-black border-4 border-yellow-300 hover:bg-yellow-300'
                : 'bg-black text-white border-2 border-white hover:bg-slate-900';
            } else if (cat.id === 'PRI' || isPriorityButton) {
              bgStyle =
                'bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-950 text-white border-2 border-purple-500 shadow-purple-900/20';
            } else {
              switch (cat.id) {
                case 'GEN':
                  bgStyle =
                    'bg-gradient-to-br from-blue-700 to-indigo-900 text-white border-2 border-blue-500 shadow-blue-950/20';
                  break;
                case 'DOC':
                  bgStyle =
                    'bg-gradient-to-br from-emerald-700 to-teal-900 text-white border-2 border-emerald-500 shadow-emerald-950/20';
                  break;
                case 'CSH':
                  bgStyle =
                    'bg-gradient-to-br from-amber-600 to-orange-800 text-white border-2 border-amber-400 shadow-amber-950/20';
                  break;
                case 'LIC':
                  bgStyle =
                    'bg-gradient-to-br from-cyan-700 to-blue-900 text-white border-2 border-cyan-400 shadow-cyan-950/20';
                  break;
                default:
                  bgStyle = 'bg-slate-900 text-white border-2 border-slate-700';
              }
            }

            return (
              <button
                key={cat.id}
                disabled={isLocked}
                onClick={() => handleCategoryTouch(cat)}
                style={{ minHeight: '180px' }}
                className={`p-6 sm:p-7 rounded-3xl shadow-lg transition-all duration-150 text-left rtl:text-right cursor-pointer flex flex-col justify-between relative overflow-hidden group select-none active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed ${bgStyle}`}
              >
                {/* Header row inside button */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black font-mono tracking-widest ${
                        highContrast
                          ? 'bg-black text-white'
                          : 'bg-white/20 text-white backdrop-blur-xs'
                      }`}
                    >
                      {isAnyFlagActive && cat.id !== 'PRI' ? 'PRI (AUTO)' : cat.prefix}
                    </span>
                    {isPriorityButton && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-black">
                        FAST-TRACK
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                      highContrast
                        ? 'bg-black text-yellow-400'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {cat.estWait}
                  </span>
                </div>

                {/* Main titles */}
                <div className="my-3">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    {categoryTitle}
                  </h3>
                  <p
                    className={`text-xs mt-1.5 line-clamp-2 ${
                      highContrast ? 'text-black' : 'text-white/80'
                    }`}
                  >
                    {categoryDesc}
                  </p>
                </div>

                {/* Action footer */}
                <div
                  className={`pt-3 border-t flex items-center justify-between text-xs font-extrabold ${
                    highContrast
                      ? 'border-black text-black'
                      : 'border-white/20 text-white'
                  }`}
                >
                  <span>{t('printSlipBtn')}</span>
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors shadow-xs ${
                      highContrast
                        ? 'bg-black text-white'
                        : 'bg-white/25 group-hover:bg-white group-hover:text-slate-900'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>POS Slip</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Touchscreen Personal Info Modal (prompts for CNIC / Mobile on ticket click) */}
      {selectedCategoryForModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCategoryForModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500 text-white text-xs font-mono font-black">
                    {selectedCategoryForModal.prefix}
                  </span>
                  <h3 className="text-lg font-black">
                    {language === 'ur'
                      ? selectedCategoryForModal.urTitle
                      : language === 'sd'
                      ? selectedCategoryForModal.sdTitle
                      : selectedCategoryForModal.enTitle}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t('personalInfoSubtitle')}
                </p>
              </div>
              <button
                onClick={() => setSelectedCategoryForModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields for CNIC, Mobile & Name */}
            <div className="p-5 sm:p-6 space-y-4 bg-slate-50">
              {/* Assistance Flags Notice */}
              {selectedFlags.length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900 font-bold">
                  <HeartHandshake className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>{t('priorityActiveBadge')}</span>
                </div>
              )}

              {/* CNIC Number Field */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  {t('cnicLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 px-3.5 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cnicInput}
                    onChange={(e) => {
                      const formatted = formatCNICInput(e.target.value);
                      setCnicInput(formatted);
                      if (cnicError) setCnicError(null);
                    }}
                    placeholder={t('cnicPlaceholder')}
                    className="w-full ltr:pl-11 rtl:pr-11 py-3.5 px-4 rounded-2xl border border-slate-300 bg-white font-mono text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                {cnicError && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{cnicError}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('cnicHelp')}
                </p>
              </div>

              {/* Mobile Phone Number Field */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  {t('phoneLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 px-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setPhoneInput(formatted);
                      if (phoneError) setPhoneError(null);
                    }}
                    placeholder={t('phonePlaceholder')}
                    className="w-full ltr:pl-11 rtl:pr-11 py-3.5 px-4 rounded-2xl border border-slate-300 bg-white font-mono text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs font-bold text-rose-600 mt-1">{phoneError}</p>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('phoneHelp')}
                </p>
              </div>

              {/* Citizen Name Field */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  {t('fullNameLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 px-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    placeholder={t('fullNamePlaceholder')}
                    className="w-full ltr:pl-11 rtl:pr-11 py-3.5 px-4 rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => executeIssueTicket(selectedCategoryForModal, true)}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors text-center"
              >
                {language === 'sd'
                  ? 'سڌو سنئون ٽوڪن پرنٽ ڪريو'
                  : language === 'ur'
                  ? 'بغیر معلومات براہ راست پرنٹ کریں'
                  : 'Skip Info & Print Directly'}
              </button>

              <button
                type="button"
                onClick={() => executeIssueTicket(selectedCategoryForModal, false)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer hover:shadow-lg"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                <span>{t('printSlipBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Thermal Receipt Auto-Print Modal */}
      {issuedTicket && (
        <TicketSlipModal
          token={issuedTicket.token}
          estimate={issuedTicket.estimate}
          onClose={() => setIssuedTicket(null)}
          autoPrint={true}
        />
      )}
    </div>
  );
};
