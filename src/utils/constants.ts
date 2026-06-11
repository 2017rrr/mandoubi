export const PRICES = {
  standard: 2.000,
} as const;

// عمولة الشركة لكل طلب: 1 دينار
export const COMMISSION = 1.000;

// نصيب المندوب بعد خصم العمولة
export const DRIVER_EARNINGS = {
  standard: 1.000, // 2 - 1
} as const;

// دالة مساعدة لحساب نصيب المندوب
export const getDriverEarning = (amount: number): number => Math.max(amount - COMMISSION, 0);

export const BENEFITPAY_NUMBER = '39105085';

export type DeliveryType = 'standard';
export type OrderStatus = 'pending' | 'awaiting_driver' | 'driver_assigned' | 'arrived_pickup' | 'loaded' | 'in_transit' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected';
export type UserRole = 'store' | 'driver' | 'admin';

export const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'جديد', color: 'bg-muted text-muted-foreground' },
  awaiting_driver: { label: 'بانتظار السائق', color: 'bg-warning/20 text-warning' },
  driver_assigned: { label: 'تم تعيين السائق', color: 'bg-primary/20 text-primary' },
  arrived_pickup: { label: 'وصل للاستلام', color: 'bg-success/20 text-success' },
  loaded: { label: 'تم التحميل', color: 'bg-success/20 text-success' },
  in_transit: { label: 'جاري التوصيل', color: 'bg-primary/20 text-primary' },
  delivered: { label: 'تم التسليم ✓', color: 'bg-success/20 text-success' },
  cancelled: { label: 'ملغي', color: 'bg-destructive/20 text-destructive' },
};

export const formatAmount = (amount: number) => `${(amount ?? 0).toFixed(3)} BD`;

export const openMapPicker = () => {
  window.open('https://maps.google.com', '_blank');
};

export const openNavigation = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
};

export const openLocation = (lat: number, lng: number) => {
  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
};
