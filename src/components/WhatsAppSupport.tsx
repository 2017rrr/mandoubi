import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SUPPORT_URL = 'https://wa.me/97339105085?text=' + encodeURIComponent('مرحباً، أحتاج مساعدة في تطبيق Mandoubi');

export const WhatsAppSupport = () => {
  const { t } = useTranslation();
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('support.contactSupport')}
      title={t('support.contactSupport')}
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-[hsl(142_70%_45%)] px-4 py-3 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="text-sm font-medium hidden sm:inline">{t('support.contactSupport')}</span>
    </a>
  );
};
