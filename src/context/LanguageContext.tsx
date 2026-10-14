import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, SUPPORTED_LANGUAGES, translations, TranslationKey, LanguageOption } from '../i18n/translations.ts';

interface LanguageContextType {
  language: Language;
  languageOption: LanguageOption;
  setLanguage: (lang: Language) => void;
  isRtl: boolean;
  t: (key: TranslationKey, fallback?: string) => string;
  speak: (text?: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  showLanguageModal: boolean;
  setShowLanguageModal: (open: boolean) => void;
  showHelpModal: boolean;
  setShowHelpModal: (open: boolean) => void;
}

const STORAGE_LANG_KEY = 'civic_selected_language';
const STORAGE_FIRST_VISIT_KEY = 'civic_language_chosen';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_LANG_KEY) as Language | null;
    if (saved && (saved === 'en' || saved === 'ur' || saved === 'sd')) {
      return saved;
    }
    // Default to English or check navigator language
    return 'en';
  });

  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(() => {
    // If user has never selected a language before, show welcoming picker
    const hasChosen = localStorage.getItem(STORAGE_FIRST_VISIT_KEY);
    return !hasChosen;
  });

  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const languageOption = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRtl = languageOption.dir === 'rtl';

  // Sync document attributes and font class
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    if (isRtl) {
      document.body.classList.add('rtl-active');
    } else {
      document.body.classList.remove('rtl-active');
    }
  }, [language, isRtl]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem(STORAGE_LANG_KEY, newLang);
    localStorage.setItem(STORAGE_FIRST_VISIT_KEY, 'true');
    setShowLanguageModal(false);
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const dict = translations[language] || translations.en;
      const val = (dict as any)[key] || (translations.en as any)[key];
      return val || fallback || key;
    },
    [language]
  );

  // Stop any active Web Speech playback
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Web Speech API Voice Assistance
  const speak = useCallback(
    (customText?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const textToSpeak = customText || t('voiceIntro');
      if (!textToSpeak) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      let matchedVoice: SpeechSynthesisVoice | undefined;

      if (language === 'ur') {
        matchedVoice = voices.find((v) => v.lang.startsWith('ur')) ||
                       voices.find((v) => v.lang.startsWith('ar')) ||
                       voices.find((v) => v.lang.includes('PK') || v.lang.includes('IN'));
        utterance.lang = 'ur-PK';
        utterance.rate = 0.88; // Slower for clear comprehension
      } else if (language === 'sd') {
        matchedVoice = voices.find((v) => v.lang.startsWith('sd')) ||
                       voices.find((v) => v.lang.startsWith('ur')) ||
                       voices.find((v) => v.lang.startsWith('ar'));
        utterance.lang = 'sd-PK';
        utterance.rate = 0.85; // Slower pace for clarity
      } else {
        matchedVoice = voices.find((v) => v.lang.startsWith('en'));
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language, t]
  );

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        languageOption,
        setLanguage,
        isRtl,
        t,
        speak,
        stopSpeaking,
        isSpeaking,
        showLanguageModal,
        setShowLanguageModal,
        showHelpModal,
        setShowHelpModal,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
