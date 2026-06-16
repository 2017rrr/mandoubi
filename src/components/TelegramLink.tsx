import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const TelegramLink = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('generate_telegram_link_code', {
      p_user_id: user.id,
    });
    if (error || !data) {
      toast({ title: t('telegram.generateFailed'), variant: 'destructive' });
    } else {
      setCode(data);
    }
    setLoading(false);
  };

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">✈️</span>
        <h3 className="font-bold">{t('telegram.linkBot')}</h3>
      </div>

      {!code ? (
        <>
          <p className="text-sm text-muted-foreground">
            {t('telegram.linkDesc')}
          </p>
          <Button onClick={generateCode} disabled={loading} className="w-full h-11 rounded-xl" variant="outline">
            {loading ? t('telegram.generating') : t('telegram.generateCode')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('telegram.openBotInstructions')}
          </p>
          <div className="bg-muted rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('telegram.sendCodeInBot')}</p>
            <p className="text-3xl font-bold tracking-widest text-primary font-mono">{code}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyCode} className="flex-1 h-11 rounded-xl" variant="outline">
              {copied ? t('telegram.copied') : t('telegram.copyCode')}
            </Button>
            <Button onClick={generateCode} disabled={loading} className="h-11 rounded-xl px-4" variant="ghost">
              🔄
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('telegram.dontShareCode')}
          </p>
        </>
      )}
    </div>
  );
};

export default TelegramLink;
