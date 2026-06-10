import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PRICES, BENEFITPAY_NUMBER, formatAmount, openMapPicker, type DeliveryType } from '@/utils/constants';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const WHATSAPP_NUMBER = '97339105085';
const DRAFT_KEY = 'store_new_order_draft';

const StoreNewOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportReason, setSupportReason] = useState('');

  // تحميل المسودة من localStorage عند بدء الصفحة
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  };

  const draft = loadDraft();

  const [pickupAddress, setPickupAddress] = useState(draft?.pickupAddress || '');
  const [deliveryAddress, setDeliveryAddress] = useState(draft?.deliveryAddress || '');
  const [deliveryType] = useState<DeliveryType>('standard');
  const [description, setDescription] = useState(draft?.description || '');
  const [clientPhone, setClientPhone] = useState(draft?.clientPhone || '');
  const [pickupTime, setPickupTime] = useState<'immediate' | 'scheduled'>(draft?.pickupTime || 'immediate');
  const [scheduledDate, setScheduledDate] = useState(draft?.scheduledDate || '');
  const [notes, setNotes] = useState(draft?.notes || '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // حفظ تلقائي عند كل تغيير
  useEffect(() => {
    const draftData = { pickupAddress, deliveryAddress, description, clientPhone, pickupTime, scheduledDate, notes };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [pickupAddress, deliveryAddress, deliveryType, description, clientPhone, pickupTime, scheduledDate, notes]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  useEffect(() => {
    if (!user) return;
    supabase.from('stores').select('id, store_name').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setStoreId(data.id);
        setStoreName(data.store_name || '');
      }
    });
  }, [user]);

  const verifyReceipt = async (receiptPath: string, expectedAmount: number): Promise<boolean> => {
    setVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-receipt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ receiptPath, expectedAmount }),
        }
      );

      if (!response.ok) {
        throw new Error('Verification request failed');
      }

      const result = await response.json();

      if (result.approved) {
        toast({ title: t('store.receiptApproved') });
        return true;
      } else {
        setSupportReason(result.reason || t('store.receiptRejected'));
        setSupportDialogOpen(true);
        return false;
      }
    } catch (error) {
      console.error('Receipt verification error:', error);
      setSupportReason(t('store.receiptVerificationFailed'));
      setSupportDialogOpen(true);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    if (!receiptFile) {
      toast({ title: t('store.receiptRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);

    // 1. Upload receipt
    const path = `receipts/${Date.now()}.${receiptFile.name.split('.').pop()}`;
    const { data: uploadData } = await supabase.storage.from('receipts').upload(path, receiptFile);
    if (!uploadData) {
      toast({ title: t('common.error'), description: 'Failed to upload receipt', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const receiptUrl = uploadData.path;
    const amount = PRICES[deliveryType];

    // 2. Verify receipt BEFORE creating order
    const approved = await verifyReceipt(receiptUrl, amount);
    if (!approved) {
      // Delete uploaded receipt since order won't be created
      await supabase.storage.from('receipts').remove([receiptUrl]);
      setLoading(false);
      return;
    }

    // 3. Create order only after successful verification
    const { data: order, error } = await supabase.from('orders').insert({
      store_id: storeId,
      client_phone: clientPhone,
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      delivery_type: deliveryType,
      amount,
      description,
      notes,
      pickup_time: pickupTime === 'scheduled' ? scheduledDate : 'immediate',
      receipt_url: receiptUrl,
      payment_status: 'confirmed',
      status: 'pending',
    }).select().single();

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // 4. Send notifications to admins
    const { data: adminIds } = await supabase.rpc('get_admin_ids');
    if (adminIds && adminIds.length > 0) {
      for (const admin of adminIds) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          order_id: order.id,
          type: 'new_order',
          title: 'طلب جديد',
          body: `طلب جديد #${order.order_number} من ${storeName}`,
        });
      }
    }

    toast({ title: t('store.orderCreated'), description: `${t('store.orderNumber')} #${order.order_number}` });
    clearDraft();
    navigate('/store');
    setLoading(false);
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('مرحباً، أحتاج مساعدة بخصوص الدفع')}`, '_blank');
  };

  return (
    <div className="page-content">
      {verifying && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center gap-4 shadow-lg">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium">{t('store.verifyingReceipt')}</p>
          </div>
        </div>
      )}

      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive text-center">❌ {t('store.paymentFailed')}</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {supportReason}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-center text-sm text-muted-foreground">{t('store.contactSupportDesc')}</p>
            <Button onClick={openWhatsApp} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2">
              <span className="text-xl">💬</span>
              {t('store.contactSupport')}
            </Button>
            <Button variant="outline" onClick={() => setSupportDialogOpen(false)} className="w-full h-12 rounded-xl">
              {t('common.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('store.orderDetails')}</h2>
          {(pickupAddress || deliveryAddress || description || clientPhone) && (
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setPickupAddress(''); setDeliveryAddress('');
                setDescription(''); setClientPhone(''); setPickupTime('immediate');
                setScheduledDate(''); setNotes(''); setReceiptFile(null);
              }}
              className="text-xs text-destructive underline"
            >
              🗑 مسح النموذج
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('store.pickupLocation')}</label>
          <Input placeholder={t('store.pickupAddressPlaceholder')} value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} required className="h-12 bg-card" />
          <Button type="button" variant="outline" onClick={openMapPicker} className="w-full h-10 text-sm">
            {t('common.chooseOnMap')}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('store.deliveryLocation')}</label>
          <Input placeholder={t('store.deliveryAddressPlaceholder')} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} required className="h-12 bg-card" />
          <Button type="button" variant="outline" onClick={openMapPicker} className="w-full h-10 text-sm">
            {t('common.chooseOnMap')}
          </Button>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 text-center">
          <span className="text-2xl">🚗</span>
          <p className="font-bold text-primary text-lg mt-1">{formatAmount(PRICES.standard)}</p>
          <p className="text-sm text-muted-foreground">{t('store.deliveryType')}</p>
        </div>

        <div className="space-y-3">
          <Textarea placeholder={t('store.description')} value={description} onChange={e => setDescription(e.target.value)} required className="bg-card min-h-[80px]" />
          <div className="relative">
            <Input type="tel" placeholder={t('store.clientPhone')} value={clientPhone} onChange={e => setClientPhone(e.target.value)} required className="h-12 bg-card" dir="ltr" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('store.pickupTime')}</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPickupTime('immediate')}
                className={`flex-1 p-3 rounded-xl border text-sm ${pickupTime === 'immediate' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                {t('store.immediate')}
              </button>
              <button type="button" onClick={() => setPickupTime('scheduled')}
                className={`flex-1 p-3 rounded-xl border text-sm ${pickupTime === 'scheduled' ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                {t('store.scheduled')}
              </button>
            </div>
            {pickupTime === 'scheduled' && (
              <Input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="h-12 bg-card" dir="ltr" />
            )}
          </div>

          <Textarea placeholder={t('store.notes')} value={notes} onChange={e => setNotes(e.target.value)} className="bg-card" />
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h3 className="font-bold">{t('store.paymentInfo')}</h3>
          <p className="text-sm text-muted-foreground">{t('store.paymentDesc')}</p>
          <p className="text-2xl font-bold text-center text-primary" dir="ltr">{BENEFITPAY_NUMBER}</p>
          {deliveryType && (
            <p className="text-center font-medium">{t('common.amount')}: {formatAmount(PRICES[deliveryType])}</p>
          )}
          <div>
            <label className="text-sm text-muted-foreground">{t('store.receiptUpload')}</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setReceiptFile(e.target.files?.[0] || null)}
              className="mt-2 w-full text-sm file:bg-primary file:text-primary-foreground file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-sm"
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading || verifying || !receiptFile}>
          {loading ? t('store.submitting') : t('store.confirmOrder')}
        </Button>
      </form>
    </div>
  );
};

export default StoreNewOrder;
