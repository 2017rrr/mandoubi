interface CarLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export const CarLogo = ({ size = 48, color = 'white', className = '' }: CarLogoProps) => (
  <svg
    width={size}
    height={size * 0.6}
    viewBox="0 0 100 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* هيكل السيارة السفلي */}
    <path
      d="M4 32 L4 46 Q4 51 9 51 L91 51 Q96 51 96 46 L96 32 Z"
      fill={color}
    />
    {/* كابينة السيارة */}
    <path
      d="M22 32 L30 14 Q32 9 37 9 L63 9 Q68 9 70 14 L78 32 Z"
      fill={color}
    />
    {/* نوافذ السيارة */}
    <path
      d="M38 11 L34 30 L56 30 L56 11 Q55 10 54 10 Z"
      fill="rgba(0,0,0,0.38)"
    />
    <path
      d="M58 11 L58 30 L66 30 L62 11 Q61 10 60 10 Z"
      fill="rgba(0,0,0,0.38)"
    />
    {/* فاصل النوافذ */}
    <rect x="55.5" y="10" width="1.5" height="20" fill="rgba(0,0,0,0.2)" rx="1"/>
    {/* العجلة الأمامية */}
    <circle cx="76" cy="51" r="10" fill="#111"/>
    <circle cx="76" cy="51" r="5.5" fill="rgba(255,255,255,0.12)"/>
    <circle cx="76" cy="51" r="2" fill="rgba(255,255,255,0.35)"/>
    {/* العجلة الخلفية */}
    <circle cx="24" cy="51" r="10" fill="#111"/>
    <circle cx="24" cy="51" r="5.5" fill="rgba(255,255,255,0.12)"/>
    <circle cx="24" cy="51" r="2" fill="rgba(255,255,255,0.35)"/>
    {/* مصباح أمامي */}
    <rect x="92" y="34" width="6" height="7" rx="2.5" fill="rgba(255,230,120,0.95)"/>
    {/* مصباح خلفي */}
    <rect x="2" y="34" width="5" height="7" rx="2" fill="rgba(255,70,70,0.85)"/>
    {/* شبكة أمامية */}
    <rect x="91" y="43" width="6" height="4" rx="1.5" fill="rgba(255,255,255,0.25)"/>
  </svg>
);

export default CarLogo;
