import { useLanguage } from '../context/LanguageContext';

/**
 * Small HR/EN toggle. Clicking a language immediately re-renders the whole
 * app in that language via LanguageContext (persisted in localStorage).
 */
export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        type="button"
        className={`chip ${language === 'hr' ? 'active' : ''}`}
        onClick={() => setLanguage('hr')}
      >
        🇭🇷 HR
      </button>
      <button
        type="button"
        className={`chip ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
