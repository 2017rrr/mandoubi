import { STATUS_LABELS, formatAmount, openLocation, type OrderStatus } from '@/utils/constants';
import { MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface OrderCardProps {
  order: {
    id: string;
    order_number: number;
    pickup_address: string;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    delivery_address: string;
    delivery_lat?: number | null;
    delivery_lng?: number | null;
    delivery_type: string;
    amount: number;
    driver_amount?: number | null;
    status: string;
    client_phone?: string;
    created_at: string;
  };
  showChat?: boolean;
  showDriverAmount?: boolean;
  onClick?: () => void;
}

export const OrderCard = ({ order, showChat = true, showDriverAmount = false, onClick }: OrderCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const statusKey = order.status as OrderStatus;
  const statusInfo = STATUS_LABELS[statusKey] || STATUS_LABELS.pending;
  const statusLabel = t(`status.${statusKey}`) || statusInfo.label;
  const displayAmount = showDriverAmount
    ? (order.driver_amount ?? (Number(order.amount) - 1))
    : order.amount;

  return (
    <div
      className="bg-card rounded-2xl border border-border p-4 space-y-3 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => onClick ? onClick() : navigate(`/order/${order.id}`)}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">🧾 {t('nav.orders')} #{order.order_number}</span>
        <span className={`status-badge ${statusInfo.color}`}>{statusLabel}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-muted-foreground text-xs">{t('common.from')}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (order.pickup_lat && order.pickup_lng) openLocation(order.pickup_lat, order.pickup_lng);
              }}
              className="block text-primary text-xs underline"
            >
              {order.pickup_address}
            </button>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-success mt-0.5 shrink-0" />
          <div>
            <span className="text-muted-foreground text-xs">{t('common.to')}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (order.delivery_lat && order.delivery_lng) openLocation(order.delivery_lat, order.delivery_lng);
              }}
              className="block text-primary text-xs underline"
            >
              {order.delivery_address}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>🚚 {order.delivery_type === 'pickup' ? t('common.pickup') : t('common.sixwheel')}</span>
        <span className="font-semibold text-foreground">💰 {formatAmount(displayAmount)}</span>
      </div>
    </div>
  );
};
