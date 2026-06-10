import { useTranslation } from 'react-i18next';

export const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const toggle = () => {
    i18n.changeLanguage(isAr ? 'en' : 'ar');
  };

  return (
    <button
      onClick={toggle}
      className="px-2 py-1 rounded-lg text-xs font-bold bg-muted text-foreground hover:bg-muted/80 transition-colors"
    >
      {isAr ? 'EN' : 'AR'}
    </button>
  );
};
