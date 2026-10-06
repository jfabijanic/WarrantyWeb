import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getTranslation } from '../i18n/translations';

const LANGUAGE_KEY = 'warrantyplus_language';
const LanguageContext = createContext(null);

function detectDefaultLanguage() {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'hr' || stored === 'en') return stored;
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'hr';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(detectDefaultLanguage);

  const setLanguage = useCallback((lang) => {
    localStorage.setItem(LANGUAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  const t = useMemo(() => getTranslation(language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
