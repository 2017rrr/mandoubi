import { STATUS_LABELS, formatAmount, openLocation, type OrderStatus } from '@/utils/constants';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface OrderCardProps {
  order: {
    id: string; order_number: number; pickup_address: string;
    pickup_lat?: number | null; pickup_lng?: number | null;
    delivery_address: string; delivery_lat?: number | null; delivery_lng?: number | null;
    delivery_type: string; amount: number; driver_amount?: number | null;
    status: string; client_phone?: string; created_at: string;
  };
  showChat?: boolean;
  showDriverAmount?: boolean;
  onClick?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending:         { bg: 'hsl(220 20% 100% / 0.07)', text: 'hsl(220 15% 70%)', dot: 'hsl(220 15% 60%)' },
  driver_assigned: { bg: 'hsl(22 100% 55% / 0.12)',  text: 'hsl(22 100% 65%)', dot: 'hsl(22 100% 55%)' },
  arrived_pickup:  { bg: 'hsl(38 95% 55% / 0.12)',   text: 'hsl(38 95% 65%)',  dot: 'hsl(38 95% 55%)' },
  loaded:          { bg: 'hsl(38 95% 55% / 0.12)',   text: 'hsl(38 95% 65%)',  dot: 'hsl(38 95% 55%)' },
  in_transit:      { bg: 'hsl(22 100% 55% / 0.12)',  text: 'hsl(22 100% 65%)', dot: 'hsl(22 100% 55%)' },
  delivered:       { bg: 'hsl(152 76% 42% / 0.12)',  text: 'hsl(152 76% 55%)', dot: 'hsl(152 76% 45%)' },
  cancelled:       { bg: 'hsl(0 84% 60% / 0.10)',    text: 'hsl(0 84% 65%)',   dot: 'hsl(0 84% 60%)' },
};

export const OrderCard = ({ order, showDriverAmount = false, onClick }: OrderCardProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const statusKey = order.status as OrderStatus;
  const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS.pending;
  const statusLabel = t(`status.${statusKey}`) || statusInfo.label;
  const statusColor = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;
  const displayAmount = showDriverAmount
    ? (order.driver_amount ?? (Number(order.amount) - 1))
    : order.amount;

  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <div
      className="order-card"
      style={isActive ? { borderColor: 'hsl(22 100% 55% / 0.2)', boxShadow: '0 4px 24px hsl(22 100% 55% / 0.08)' } : {}}
      onClick={() => onClick ? onClick() : navigate(`/order/${order.id}`)}
    >
      {/* رأس البطاقة */}
      <div className="flex items-center justify-between mb-3">
        <span className="order-number-pill">
          #{order.order_number}
        </span>
        {/* شارة الحالة */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: statusColor.bg, color: statusColor.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor.dot }} />
          {statusLabel}
        </div>
      </div>

      {/* خط فاصل */}
      <div className="h-px mb-3" style={{ background: 'hsl(20 20% 100% / 0.05)' }} />

      {/* العناوين — route display */}
      <div className="flex gap-3">
        {/* ── عمود الأيقونات والـ connector ── */}
        <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
          {/* نقطة الاستلام */}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'hsl(24 100% 56% / 0.15)' }}>
            <MapPin size={13} style={{ color: 'hsl(24 100% 62%)' }} />
          </div>
          {/* خط رابط منقّط */}
          <div className="flex-1 my-1" style={{
            width: '2px',
            minHeight: '14px',
            borderRight: '2px dashed hsl(152 76% 45% / 0.35)',
          }} />
          {/* نقطة التوصيل */}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'hsl(152 76% 42% / 0.15)' }}>
            <MapPin size={13} style={{ color: 'hsl(152 76% 52%)' }} />
          </div>
        </div>

        {/* ── عمود النصوص ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2.5">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">{t('common.from')}</p>
            <button
              onClick={e => { e.stopPropagation(); if (order.pickup_lat && order.pickup_lng) openLocation(order.pickup_lat, order.pickup_lng); }}
              className="text-[13px] text-foreground/90 text-right leading-snug line-clamp-1 hover:text-primary transition-colors w-full"
            >
              {order.pickup_address}
            </button>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">{t('common.to')}</p>
            <button
              onClick={e => { e.stopPropagation(); if (order.delivery_lat && order.delivery_lng) openLocation(order.delivery_lat, order.delivery_lng); }}
              className="text-[13px] text-foreground/90 text-right leading-snug line-clamp-1 hover:text-primary transition-colors w-full"
            >
              {order.delivery_address}
            </button>
          </div>
        </div>
      </div>

      {/* تذييل البطاقة */}
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid hsl(20 20% 100% / 0.05)' }}>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-GB')}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('common.amount')}</span>
          <span
            className="font-black text-sm"
            style={{ color: 'hsl(22 100% 62%)' }}
          >
            {formatAmount(displayAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
