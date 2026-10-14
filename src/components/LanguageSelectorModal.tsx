import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { SUPPORTED_LANGUAGES, Language } from '../i18n/translations.ts';
import { Languages, Volume2, Check, Globe, HelpCircle, X, Sparkles } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t, speak, isSpeaking, stopSpeaking } = useLanguage();

  if (!isOpen) return null;

  const handleSelectLanguage = (code: Language) => {
    setLanguage(code);
  };

  const handleAudioSample = (code: Language, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (code === 'ur') {
      speak('سیوک کیو میں خوش آمدید۔ آپ نے اردو زبان منتخب کی ہے۔');
    } else if (code === 'sd') {
      speak('سيوڪ ڪيو ۾ ڀلي ڪري آيا. توهان سنڌي ٻولي چونڊي آهي.');
    } else {
      speak('Welcome to CivicQueue. You have selected English language.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Languages className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                Multilingual Accessibility / عوامي سهولت
              </span>
              <h2 className="text-2xl font-black mt-1">
                Select Your Language / ٻولي چونڊيو / اپنی زبان
              </h2>
            </div>
          </div>
          <p className="text-indigo-100 text-sm mt-1 leading-relaxed">
            Please choose your language. The entire website, buttons, voice assistance, and instructions will adjust immediately.
          </p>
        </div>

        {/* Language Options Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`relative cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl select-none">{lang.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black text-slate-900 ${lang.fontClass}`}>
                          {lang.nativeName}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {lang.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {lang.code === 'en' && 'English language interface & instructions'}
                        {lang.code === 'ur' && 'اردو زبان میں تمام بٹن، آواز اور ہدایات'}
                        {lang.code === 'sd' && 'سنڌي ٻوليءَ ۾ سمورا بٽڻ، آواز ۽ رهنمائي'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Audio Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handleAudioSample(lang.code, e)}
                      title="Audio Sample / آواز ٻڌو"
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-700 transition-colors shadow-sm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Selection Indicator */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-300 text-transparent group-hover:border-indigo-400'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rural & Villagers accessibility note */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Village & Community Accessibility:</span> People who cannot read can use the speaker button (<Volume2 className="w-3.5 h-3.5 inline mx-0.5 text-amber-700" />) on any page to listen to instructions in Urdu or Sindhi.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-800">{language.toUpperCase()}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-md transition-colors"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
