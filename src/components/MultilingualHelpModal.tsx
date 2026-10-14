import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  HelpCircle,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  CreditCard,
  Printer,
  Tv,
  HeartHandshake,
  UserCheck,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';

interface MultilingualHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultilingualHelpModal: React.FC<MultilingualHelpModalProps> = ({ isOpen, onClose }) => {
  const { language, t, speak, isSpeaking, stopSpeaking, isRtl } = useLanguage();

  if (!isOpen) return null;

  const handleReadEntireGuide = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    let speechScript = '';
    if (language === 'ur') {
      speechScript =
        'سیوک کیو شہری رہنمائی۔ مرحلہ نمبر ایک: کیوسک اسکرین پر اپنی مطلوبہ سروس کا بڑا بٹن دبائیں۔ اگر آپ بزرگ ہیں یا معذور ہیں تو اوپر والا رعایت کا بٹن دبائیں۔ مرحلہ نمبر دو: اپنا تیرہ ہندسوں کا شناختی کارڈ یا موبائل نمبر درج کریں۔ مرحلہ نمبر تین: مشین سے نکلنے والی ٹوکن رسید حاصل کریں۔ مرحلہ نمبر چار: انتظار گاہ میں بیٹھیں، اسکرین دیکھیں اور گھنٹی بجنے پر بتائے گئے کاؤنٹر پر چلے جائیں۔';
    } else if (language === 'sd') {
      speechScript =
        'سيوڪ ڪيو شهري رهنمائي. پهريون مرحلو: ڪيوسڪ اسڪرين تي پنهنجي گهربل سروس جو وڏو بٽڻ دٻايو. جيڪڏهن توهان بزرگ آهيو يا معذور آهيو ته مٿيون نيرو بٽڻ دٻايو. ٻيو مرحلو: پنهنجو تيرنهن انگن وارو شناختي ڪارڊ يا موبائل نمبر داخل ڪريو. ٽيون مرحلو: مشين مان نڪرندڙ پرچي وٺو. چوٿون مرحلو: انتظار گاهه ۾ ويهو ۽ اسڪرين تي پنهنجي واريءَ جو انتظار ڪريو.';
    } else {
      speechScript =
        'Welcome to CivicQueue help guide. Step 1: Touch your service category button on the kiosk. If you need assistance as a senior citizen or person with disability, tap the top flag. Step 2: Enter your 13-digit CNIC or mobile number. Step 3: Collect your printed paper token slip. Step 4: Relax in the waiting hall, watch the TV screens, and listen for the audio chime when your number is called.';
    }

    speak(speechScript);
  };

  const steps = [
    {
      num: '1',
      title: t('helpStep1Title'),
      desc: t('helpStep1Text'),
      icon: HeartHandshake,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      num: '2',
      title: t('helpStep2Title'),
      desc: t('helpStep2Text'),
      icon: CreditCard,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      num: '3',
      title: t('helpStep3Title'),
      desc: t('helpStep3Text'),
      icon: Printer,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      num: '4',
      title: t('helpStep4Title'),
      desc: t('helpStep4Text'),
      icon: Tv,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 my-8 overflow-hidden"
        role="dialog"
        aria-modal="true"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with Audio Reader Button */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-indigo-800 text-white p-6 relative">
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="absolute top-5 ltr:right-5 rtl:left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <HelpCircle className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Citizen Guidance / رهنمائي
                </span>
                <h2 className="text-2xl font-black mt-1">
                  {t('helpModalTitle')}
                </h2>
              </div>
            </div>

            {/* Listen Button for villagers / limited literacy */}
            <button
              type="button"
              onClick={handleReadEntireGuide}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm shadow-lg transition-all ${
                isSpeaking
                  ? 'bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-400/40 animate-pulse'
                  : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 ring-4 ring-amber-300/30'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5" />
                  <span>{t('stopVoice')}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  <span>{t('listenVoice')}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-emerald-100 text-sm mt-3 leading-relaxed">
            {t('helpModalSubtitle')}
          </p>
        </div>

        {/* Steps List */}
        <div className="p-6 md:p-8 space-y-5 max-h-[60vh] overflow-y-auto">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-4"
              >
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                    {s.num}
                  </span>
                  <div className={`p-2 rounded-xl border ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5 flex items-center gap-2">
                    {s.title}
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Registration & Login Guidance */}
          <div className="p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40">
            <h4 className="font-bold text-indigo-950 text-base mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              {language === 'ur' && 'آن لائن رجسٹریشن اور لاگ ان کی رہنمائی:'}
              {language === 'sd' && 'آن لائن رجسٽريشن ۽ لاگ ان جي رهنمائي:'}
              {language === 'en' && 'Online Citizen Portal Registration & Login:'}
            </h4>
            <p className="text-indigo-900 text-xs leading-relaxed">
              {language === 'ur' &&
                'اگر آپ گھر بیٹھے سروسز اور اپنے پرانے ٹوکنز کا ریکارڈ رکھنا چاہتے ہیں، تو "شہری پورٹل" پر جا کر اپنا نام، شناختی کارڈ، فون نمبر اور پاس ورڈ درج کر کے اکاؤنٹ بنا سکتے ہیں۔'}
              {language === 'sd' &&
                'جيڪڏهن توهان گھر ويٺي سروسز ۽ پراڻن ٽوڪنن جو رڪارڊ رکڻ چاهيو ٿا، ته "شهري پورٽل" تي وڃي پنهنجو نالو، شناختي ڪارڊ، فون نمبر ۽ پاس ورڊ لکي اڪائونٽ ٺاهي سگهو ٿا.'}
              {language === 'en' &&
                'Citizens can register on the Citizen Portal by submitting their full name, 13-digit CNIC, mobile number, and password to track active tokens and view past services anytime.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Voice & Urdu/Sindhi script supported</span>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors text-sm"
          >
            {t('closeHelp')}
          </button>
        </div>
      </div>
    </div>
  );
};
