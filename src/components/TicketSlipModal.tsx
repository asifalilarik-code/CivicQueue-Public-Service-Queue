import React, { useEffect } from 'react';
import { Token, WaitEstimate } from '../types/queue.ts';
import { SERVICE_CATEGORIES } from '../services/queueStore.ts';
import { formatWaitTime } from '../services/calculator.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Printer, X, CheckCircle2, Clock, Users, ShieldCheck, Volume2 } from 'lucide-react';

interface TicketSlipModalProps {
  token: Token | null;
  estimate: WaitEstimate | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export const TicketSlipModal: React.FC<TicketSlipModalProps> = ({
  token,
  estimate,
  onClose,
  autoPrint = false,
}) => {
  const { language, t, speak, isSpeaking, stopSpeaking } = useLanguage();

  if (!token) return null;

  const category = SERVICE_CATEGORIES[token.serviceType] || SERVICE_CATEGORIES.GEN;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(token.createdAt).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = new Date(token.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Trigger thermal receipt auto-print if requested
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print error:', e);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const estWaitMin = estimate ? Math.max(1, Math.round(estimate.estWaitSec / 60)) : 2;
  const positionNum = estimate?.position ?? token.positionInQueue ?? 1;
  const citizenCnic = token.citizenCnicMasked || token.cnic;
  const citizenPhone = token.citizenPhone || token.phone;

  const handleSpeakTicket = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (language === 'ur') {
      speak(`آپ کا ٹوکن نمبر ${token.tokenNumber} ہے۔ قطار میں آپ کی پوزیشن نمبر ${positionNum} ہے۔ برائے مہربانی ہال میں اپنی باری کا انتظار کریں۔`);
    } else if (language === 'sd') {
      speak(`توهان جو ٽوڪن نمبر ${token.tokenNumber} آهي. قطار ۾ توهان جو نمبر ${positionNum} آهي. مهرباني ڪري هال ۾ پنهنجي واريءَ جو انتظار ڪريو.`);
    } else {
      speak(`Your token number is ${token.tokenNumber}. You are position ${positionNum} in line. Estimated wait time is ${estWaitMin} minutes.`);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn print:p-0 print:bg-white"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-[58mm] print:mx-auto">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="bg-slate-950 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">{t('receiptTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakTicket}
              title={t('listenVoice')}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Body - 58mm/80mm Thermal Receipt Format */}
        <div id="printable-ticket" className="p-4 sm:p-6 bg-slate-50 text-slate-900 print:bg-white print:p-1">
          <div className="bg-white p-5 rounded-2xl border border-dashed border-slate-300 shadow-xs text-center space-y-3 print:border-none print:shadow-none print:p-0">
            {/* Thermal POS Header */}
            <div className="border-b border-dashed border-slate-300 pb-2.5">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                GOVERNMENT CIVIC SERVICE
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                حکومتی عوامی خدمت / سرڪاري عوامي سهولت
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5 px-1">
                <span>{formattedDate}</span>
                <span>{formattedTime}</span>
              </div>
            </div>

            {/* Department */}
            <div className="bg-slate-100/80 rounded-xl py-1.5 px-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('departmentLabel')}
              </span>
              <span className="text-sm font-black text-slate-800">
                {category.name}
              </span>
              {token.serviceType === 'PRI' && (
                <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mt-0.5">
                  ★ PRIORITY EXPRESS LANE ★
                </div>
              )}
            </div>

            {/* Large Bold Token Number */}
            <div className="py-2 bg-gradient-to-b from-indigo-50/60 to-slate-50 rounded-2xl border border-indigo-100/80">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">
                {t('bilingualAapKaNumber')}
              </p>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 font-mono py-1">
                {token.tokenNumber}
              </div>
              <p className="text-[10px] font-semibold text-slate-500">
                Aap ka number / توهان جو نمبر
              </p>
            </div>

            {/* Position & Estimated Wait */}
            <div className="grid grid-cols-2 gap-2 border-y border-dashed border-slate-300 py-2.5 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  {t('queuePositionLabel')}
                </span>
                <span className="text-base font-black text-slate-900 font-mono">
                  #{positionNum}
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">قطار ۾ نمبر</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  {t('estWaitLabel')}
                </span>
                <span className="text-base font-black text-indigo-600 font-mono">
                  ~{estWaitMin} {t('mins')}
                </span>
                <span className="text-[9px] text-slate-400 block font-medium">انتظار جو وقت</span>
              </div>
            </div>

            {/* Citizen info if provided */}
            {(token.citizenName || citizenCnic || citizenPhone) && (
              <div className="text-left bg-slate-50 rounded-xl p-2.5 text-[11px] space-y-1 font-mono border border-slate-200/70">
                {token.citizenName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">{t('citizenNameLabel')}:</span>
                    <span className="font-bold text-slate-800">{token.citizenName}</span>
                  </div>
                )}
                {citizenCnic && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">{t('cnicMaskedLabel')}:</span>
                    <span className="font-bold text-slate-800">{citizenCnic}</span>
                  </div>
                )}
                {citizenPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">{t('mobileLabel')}:</span>
                    <span className="font-bold text-slate-800">{citizenPhone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="pt-1 text-[10px] text-slate-500 leading-tight">
              <p className="font-semibold text-slate-700">
                {t('hallInstruction')}
              </p>
              <p className="mt-1 font-mono text-[9px] text-slate-400">
                CivicQueue Token ID: {token.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Hidden on Print) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t('printReceipt')}</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {t('closeModal')}
          </button>
        </div>
      </div>
    </div>
  );
};
