import React, { useState } from 'react';
import {
  Token,
  WaitEstimate,
  ServiceCategoryId,
} from '../types/queue.ts';
import { SERVICE_CATEGORIES } from '../services/queueStore.ts';
import { formatWaitTime } from '../services/calculator.ts';
import { TicketSlipModal } from './TicketSlipModal.tsx';
import { playCallingChime } from '../utils/audioChime.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  validateCNIC,
  validatePhone,
  formatCNICInput,
  formatPhoneInput,
} from '../utils/security.ts';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCheck,
  CreditCard,
  Award,
  HeartHandshake,
  ArrowRight,
  Printer,
  XCircle,
  Sparkles,
  Volume2,
  X,
  Phone,
  User,
  Search,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface CitizenTrackerViewProps {
  activeTokenNumber: string | null;
  activeTokenDetails: {
    token: Token | null;
    estimate: WaitEstimate;
    counterInfo?: { id: number; name: string };
  } | null;
  onIssueToken: (
    serviceType: ServiceCategoryId,
    name?: string,
    isPriority?: boolean,
    extraData?: { cnic?: string; phone?: string }
  ) => Promise<any>;
  onRegisterToken: (tokenNumber: string) => void;
  onClearToken: () => void;
  onCancelToken: (tokenNumber: string) => Promise<any>;
  isCallingFlash: boolean;
}

export const CitizenTrackerView: React.FC<CitizenTrackerViewProps> = ({
  activeTokenNumber,
  activeTokenDetails,
  onIssueToken,
  onRegisterToken,
  onClearToken,
  onCancelToken,
  isCallingFlash,
}) => {
  const { language, t, speak, isSpeaking, stopSpeaking, isRtl } = useLanguage();

  // Selected category for the personal info modal
  const [selectedCatForModal, setSelectedCatForModal] = useState<any | null>(null);

  // Personal Info Form State
  const [citizenName, setCitizenName] = useState<string>('');
  const [cnicInput, setCnicInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isPriorityCare, setIsPriorityCare] = useState<boolean>(false);
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Generation / Submitting State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Ticket Receipt Printing Modals
  const [slipModalData, setSlipModalData] = useState<{
    token: Token;
    estimate: WaitEstimate | null;
    autoPrint: boolean;
  } | null>(null);

  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);

  const token = activeTokenDetails?.token;
  const estimate = activeTokenDetails?.estimate;
  const counterInfo = activeTokenDetails?.counterInfo;

  const categoriesList = Object.values(SERVICE_CATEGORIES);

  const getCategoryIcon = (id: ServiceCategoryId) => {
    switch (id) {
      case 'GEN':
        return <HelpCircle className="w-5 h-5 text-blue-600" />;
      case 'DOC':
        return <FileCheck className="w-5 h-5 text-indigo-600" />;
      case 'CSH':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'LIC':
        return <Award className="w-5 h-5 text-amber-600" />;
      case 'PRI':
        return <HeartHandshake className="w-5 h-5 text-purple-600" />;
    }
  };

  // 1. Trigger Personal Info Modal when citizen taps any category
  const handleCategoryClick = (cat: any) => {
    setErrorMsg(null);
    setCnicError(null);
    setPhoneError(null);
    playCallingChime();
    setSelectedCatForModal(cat);
  };

  // 2. Submit Info, Issue Token, Register, and Auto-Print
  const handleGenerateAndPrint = async (skipInfo: boolean = false) => {
    if (!selectedCatForModal) return;

    try {
      // Validate CNIC if provided
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

      // Validate Phone if provided
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

      setIsSubmitting(true);
      setErrorMsg(null);

      const isPriority = isPriorityCare || selectedCatForModal.id === 'PRI';
      const catId = isPriority ? 'PRI' : selectedCatForModal.id;
      const citizenNameParam = skipInfo ? undefined : citizenName.trim() || undefined;
      const cnicParam = skipInfo ? undefined : cnicInput.trim() || undefined;
      const phoneParam = skipInfo ? undefined : phoneInput.trim() || undefined;

      let resultToken: Token | null = null;
      let resultEstimate: WaitEstimate | null = null;

      // Try Dedicated Kiosk Endpoint first
      try {
        const res = await fetch('/api/kiosk/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: catId,
            flags: isPriority ? ['Priority Assistance'] : [],
            citizenName: citizenNameParam,
            cnic: cnicParam,
            phone: phoneParam,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          resultToken = data.token;
          resultEstimate = data.estimate;
        }
      } catch (e) {
        console.warn('POST /api/kiosk/issue failed in tracker, falling back to onIssueToken:', e);
      }

      // Fallback through onIssueToken prop
      if (!resultToken) {
        const fallbackRes = await onIssueToken(
          catId,
          citizenNameParam,
          isPriority,
          { cnic: cnicParam, phone: phoneParam }
        );
        if (fallbackRes?.token) {
          resultToken = fallbackRes.token;
          resultEstimate = fallbackRes.estimate || null;
        }
      }

      if (resultToken) {
        playCallingChime();
        onRegisterToken(resultToken.tokenNumber);

        // Immediately trigger thermal auto-print slip modal!
        setSlipModalData({
          token: resultToken,
          estimate: resultEstimate,
          autoPrint: true,
        });

        // Close info modal & reset fields
        setSelectedCatForModal(null);
        setCitizenName('');
        setCnicInput('');
        setPhoneInput('');
        setIsPriorityCare(false);
        setCnicError(null);
        setPhoneError(null);

        // Voice confirmation
        if (language === 'ur') {
          speak(`آپ کا ٹوکن نمبر ${resultToken.tokenNumber} جاری ہو گیا ہے اور پرنٹ کیا جا رہا ہے۔`);
        } else if (language === 'sd') {
          speak(`توهان جو ٽوڪن نمبر ${resultToken.tokenNumber} جاري ٿي ويو آهي ۽ پرنٽ ٿي رهيو آهي.`);
        } else {
          speak(`Your token number ${resultToken.tokenNumber} has been issued and is printing now.`);
        }
      } else {
        throw new Error('Failed to generate token');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!activeTokenNumber) return;
    try {
      await onCancelToken(activeTokenNumber);
      onClearToken();
      setShowLeaveModal(false);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const cleaned = searchQuery.trim().toUpperCase();
    if (!cleaned) return;

    if (!cleaned.includes('-') && cleaned.length !== 7) {
      // Allow searching by prefix
    }
    onRegisterToken(cleaned);
    setSearchQuery('');
  };

  const handleVoiceRecitation = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (!token) return;

    const positionNum = estimate?.position || 1;
    const estWaitMin = estimate ? Math.max(1, Math.round(estimate.estWaitSec / 60)) : 2;

    if (language === 'ur') {
      speak(
        `آپ کا ٹوکن نمبر ${token.tokenNumber} ہے۔ قطار میں آپ کا نمبر ${positionNum} ہے۔ اندازاً انتظار کا وقت ${estWaitMin} منٹ ہے۔`
      );
    } else if (language === 'sd') {
      speak(
        `توهان جو ٽوڪن نمبر ${token.tokenNumber} آهي. قطار ۾ توهان جو نمبر ${positionNum} آهي. اندازي موجب انتظار جو وقت ${estWaitMin} منٽ آهي.`
      );
    } else {
      speak(
        `Your token number is ${token.tokenNumber}. You are position ${positionNum} in line. Estimated wait time is ${estWaitMin} minutes.`
      );
    }
  };

  // --- SCENARIO 1: CITIZEN HAS ACTIVE TICKET TO TRACK ---
  if (activeTokenNumber && token) {
    const category = SERVICE_CATEGORIES[token.serviceType] || SERVICE_CATEGORIES.GEN;
    const isNowServing = token.status === 'SERVING';
    const isApproaching = token.status === 'APPROACHING';
    const isCompleted = token.status === 'COMPLETED';
    const isCancelled = token.status === 'CANCELLED';
    const position = estimate?.position || 0;
    const peopleAhead = Math.max(0, position - 1);

    let currentStage = 1;
    if (isCompleted) currentStage = 4;
    else if (isNowServing) currentStage = 3;
    else if (isApproaching) currentStage = 2;
    else currentStage = 1;

    return (
      <div
        className={`min-h-[calc(100vh-10rem)] py-6 sm:py-10 px-4 sm:px-6 transition-colors duration-700 ${
          isCallingFlash || isNowServing
            ? 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-slate-50'
            : isApproaching
            ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-slate-50'
            : 'bg-slate-50'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="max-w-xl mx-auto space-y-6">
          {/* Visual Calling Flash Notification */}
          {(isCallingFlash || isNowServing) && (
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-3xl shadow-2xl shadow-emerald-600/30 text-center animate-bounce">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest mb-2 border border-white/20">
                <Sparkles className="w-4 h-4 text-emerald-200" />
                {t('ticketCalledBanner')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {language === 'sd'
                  ? 'توهان جو نمبر سڏيو ويو آهي!'
                  : language === 'ur'
                  ? 'آپ کی باری آ گئی ہے!'
                  : "IT'S YOUR TURN!"}
              </h2>
              <div className="mt-2 text-emerald-100 text-sm font-medium">
                {t('proceedToCounter')}
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-wide bg-white/10 py-2.5 px-6 rounded-2xl inline-block border border-white/20">
                {token.servingCounterName || counterInfo?.name || 'Counter 1'}
              </div>
            </div>
          )}

          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 p-5 rounded-3xl text-center space-y-2">
              <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="font-black text-base">
                {language === 'sd'
                  ? 'هي ٽوڪن منسوخ ٿي چڪو آهي'
                  : language === 'ur'
                  ? 'یہ ٹوکن منسوخ کر دیا گیا ہے'
                  : 'This Token Has Been Cancelled'}
              </h3>
              <button
                onClick={onClearToken}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {language === 'sd' ? 'نئون ٽوڪن وٺو' : language === 'ur' ? 'نیا ٹوکن حاصل کریں' : 'Issue New Token'}
              </button>
            </div>
          )}

          {/* Approaching warning banner */}
          {isApproaching && !isNowServing && (
            <div className="bg-amber-50 border border-amber-200/90 text-amber-950 p-4 sm:p-5 rounded-3xl flex items-center gap-3.5 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-xs sm:text-sm">
                <strong className="font-extrabold block text-amber-950 text-base">
                  {language === 'sd'
                    ? 'توهان جي واري ويجهو آهي! (اڳيان 2 ماڻهو)'
                    : language === 'ur'
                    ? 'آپ کی باری قریب ہے! (اگلے 2 شہری)'
                    : "You're Approaching! (Next 2 in line)"}
                </strong>
                {language === 'sd'
                  ? 'مهرباني ڪري هال ۾ ڪائونٽر جي ويجهو وڃي بيهو.'
                  : language === 'ur'
                  ? 'براہ کرم سروس ہال میں کاؤنٹر کے قریب تشریف رکھیں۔'
                  : 'Please walk towards the service counter. Your ticket is about to be called.'}
              </div>
            </div>
          )}

          {/* Step Timeline */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="grid grid-cols-4 text-center relative">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-indigo-600 transition-all duration-500 -z-0"
                style={{
                  width: `${((currentStage - 1) / 3) * 100}%`,
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStage >= 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  1
                </div>
                <span className="text-[10px] sm:text-xs font-bold mt-1 text-slate-700">
                  {language === 'sd' ? 'ٽوڪن مليو' : language === 'ur' ? 'ٹوکن جاری' : 'Checked In'}
                </span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStage >= 2 ? 'bg-amber-500 text-white ring-4 ring-amber-50' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  2
                </div>
                <span className="text-[10px] sm:text-xs font-bold mt-1 text-slate-700">
                  {language === 'sd' ? 'ويجھو' : language === 'ur' ? 'قریب' : 'Approaching'}
                </span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStage >= 3 ? 'bg-emerald-600 text-white ring-4 ring-emerald-50 animate-pulse' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  3
                </div>
                <span className="text-[10px] sm:text-xs font-bold mt-1 text-slate-700">
                  {language === 'sd' ? 'ڪائونٽر تي' : language === 'ur' ? 'کاؤنٹر پر' : 'Serving'}
                </span>
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                    currentStage >= 4 ? 'bg-emerald-600 text-white ring-4 ring-emerald-50' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  4
                </div>
                <span className="text-[10px] sm:text-xs font-bold mt-1 text-slate-700">
                  {language === 'sd' ? 'مڪمل' : language === 'ur' ? 'مکمل' : 'Complete'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Card with Token Number and Wait Estimation */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t('tokenNumberLabel')}
                </span>
                <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-950">
                  {token.tokenNumber}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <span>{category.name}</span>
                  {token.isPriority && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                      ★ PRIORITY
                    </span>
                  )}
                </div>

                {/* Citizen Verified Details Display */}
                {(token.citizenName || token.citizenCnicMasked || token.citizenPhone) && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex flex-wrap items-center justify-center gap-3 font-mono">
                    {token.citizenName && (
                      <span className="font-sans font-bold text-slate-900">
                        👤 {token.citizenName}
                      </span>
                    )}
                    {token.citizenCnicMasked && (
                      <span>
                        🪪 {token.citizenCnicMasked}
                      </span>
                    )}
                    {token.citizenPhone && (
                      <span>
                        📞 {token.citizenPhone}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Waiting Stats */}
              {!isCompleted && !isCancelled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
                      <Users className="w-4 h-4 text-slate-400" />
                      {t('queuePositionLabel')}
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                      #{position}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {isNowServing
                        ? 'At counter now'
                        : `${peopleAhead} ${t('peopleAhead')}`}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {t('estWaitLabel')}
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-indigo-600 font-mono">
                      {isNowServing
                        ? '0m'
                        : estimate
                        ? formatWaitTime(estimate.estWaitSec)
                        : '~2 min'}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSlipModalData({
                        token,
                        estimate: estimate || null,
                        autoPrint: false,
                      })
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t('printReceipt')}</span>
                  </button>

                  <button
                    onClick={handleVoiceRecitation}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-colors cursor-pointer active:scale-95"
                    title={isSpeaking ? t('stopVoice') : t('listenVoice')}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>{isSpeaking ? 'Stop' : 'Voice'}</span>
                  </button>

                  <button
                    onClick={() => playCallingChime()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer active:scale-95"
                    title="Play Bell Chime"
                  >
                    <span>🔔</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClearToken}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Track or issue another ticket"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'sd' ? 'ٻيو ٽوڪن' : language === 'ur' ? 'دوسرا ٹوکن' : 'New Ticket'}</span>
                  </button>

                  {!isCompleted && !isCancelled && (
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t('cancel')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thermal Print Slip Modal */}
        {slipModalData && (
          <TicketSlipModal
            token={slipModalData.token}
            estimate={slipModalData.estimate}
            onClose={() => setSlipModalData(null)}
            autoPrint={slipModalData.autoPrint}
          />
        )}

        {/* Leave Queue Confirmation Modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {language === 'sd' ? 'ڇا توهان قطار ڇڏڻ چاهيو ٿا؟' : language === 'ur' ? 'کیا آپ قطار چھوڑنا چاہتے ہیں؟' : 'Leave the Queue?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your token will be removed from the active waiting line.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- SCENARIO 2: CITIZEN LOOKING TO ISSUE OR TRACK A TICKET ---
  return (
    <div
      className="max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          {t('trackerTitle')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {t('trackerSubtitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          {language === 'ur'
            ? 'ٹوکن حاصل کرنے کے لیے سروس کے کارڈ پر کلک کریں۔ اپنا شناختی کارڈ درج کریں اور پرنٹ شدہ رسید حاصل کریں۔'
            : language === 'sd'
            ? 'ٽوڪن حاصل ڪرڻ لاءِ سروس جي ڪارڊ تي ڪلڪ ڪريو. پنھنجو شناختي ڪارڊ داخل ڪريو ۽ پرنٽ ٿيل پرچي حاصل ڪريو.'
            : 'Click on any service card below. Enter your CNIC and contact details to generate your token with auto-print receipt.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between gap-2 max-w-lg mx-auto shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="p-1 text-rose-400 hover:text-rose-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Categories Grid (Touch to open personal info modal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categoriesList.map((cat) => {
          return (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden shadow-2xs active:scale-98"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
                    {getCategoryIcon(cat.id)}
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    {cat.prefix}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  ~{Math.round(cat.baseDurationSec / 60)} {t('mins')}
                </span>
                <span className="font-extrabold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  <span>{t('printSlipBtn')}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual lookup if citizen already has a paper slip */}
      <div className="mt-8 text-center max-w-md mx-auto pt-8 border-t border-slate-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          {t('searchPlaceholder')}
        </h4>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. GEN-102"
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 text-xs font-mono font-black uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            {t('findMyTurn')}
          </button>
        </form>
        {searchError && (
          <p className="text-xs text-rose-600 font-bold mt-2">{searchError}</p>
        )}
      </div>

      {/* 3. Personal Info Input Modal (Appears upon clicking any service card) */}
      {selectedCatForModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCatForModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500 text-white text-xs font-mono font-black">
                    {selectedCatForModal.prefix}
                  </span>
                  <h3 className="text-lg font-black">
                    {selectedCatForModal.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {language === 'sd'
                    ? 'ٽوڪن ۽ پرچي لاءِ پنهنجي معلومات داخل ڪريو'
                    : language === 'ur'
                    ? 'ٹوکن اور رسید کے لیے اپنی معلومات درج کریں'
                    : 'Enter citizen details to generate token & print receipt'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCatForModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields for CNIC, Mobile & Name */}
            <div className="p-5 sm:p-6 space-y-4 bg-slate-50">
              {/* Priority Assistance Toggle */}
              <div
                onClick={() => setIsPriorityCare(!isPriorityCare)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isPriorityCare
                    ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HeartHandshake className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <div className="text-xs font-black">
                      {language === 'sd'
                        ? 'ترجيحي سهولت (بزرگ 65+ / معذور / خاص ماڻهو)'
                        : language === 'ur'
                        ? 'ترجیحی سہولت (بزرگ 65+ / معذور افراد)'
                        : 'Priority Care (Senior 65+ / Disability / Family)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Fast-track priority queue placement
                    </div>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    isPriorityCare
                      ? 'bg-purple-600 text-white'
                      : 'border border-slate-300 bg-slate-50'
                  }`}
                >
                  {isPriorityCare && '✓'}
                </div>
              </div>

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
                disabled={isSubmitting}
                onClick={() => handleGenerateAndPrint(true)}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors text-center disabled:opacity-50"
              >
                {language === 'sd'
                  ? 'بغير معلومات سڌو ٽوڪن وٺو'
                  : language === 'ur'
                  ? 'بغیر معلومات براہ راست ٹوکن لیں'
                  : 'Skip Info & Print Directly'}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleGenerateAndPrint(false)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer hover:shadow-lg disabled:opacity-60 active:scale-98"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                <span>
                  {isSubmitting
                    ? language === 'sd'
                      ? 'ٽوڪن تيار ٿي رهيو آهي...'
                      : language === 'ur'
                      ? 'ٹوکن تیار ہو رہا ہے...'
                      : 'Issuing & Printing...'
                    : language === 'sd'
                    ? 'ٽوڪن حاصل ڪريو ۽ پرنٽ ڪريو'
                    : language === 'ur'
                    ? 'ٹوکن جاری کریں اور پرنٹ کریں'
                    : 'Issue Token & Print Slip'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Thermal Receipt Auto-Print Slip Modal */}
      {slipModalData && (
        <TicketSlipModal
          token={slipModalData.token}
          estimate={slipModalData.estimate}
          onClose={() => setSlipModalData(null)}
          autoPrint={slipModalData.autoPrint}
        />
      )}
    </div>
  );
};
