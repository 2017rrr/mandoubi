interface CarLogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export const CarLogo = ({ size = 48, color = 'white', className = '' }: CarLogoProps) => {
  const accentColor = color === 'white' ? 'rgba(255,255,255,0.90)' : color;
  const windowColor = color === 'white' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.28)';
  const wheelRim    = color === 'white' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.18)';
  const wheelHub    = color === 'white' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)';

  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── الهيكل السفلي (الجسم الرئيسي) ── */}
      <path
        d="M5 33 L5 46 Q5 52 11 52 L89 52 Q95 52 95 46 L95 33 Z"
        fill={accentColor}
      />

      {/* ── الكابينة (أعرض وأكثر توازناً) ── */}
      <path
        d="M20 33 L28 15 Q30 10 36 10 L64 10 Q70 10 72 15 L80 33 Z"
        fill={accentColor}
      />

      {/* ── النافذة الأمامية (كبيرة + واضحة عند 24px) ── */}
      <path
        d="M58 12 L62 12 Q65 12 66.5 15 L72 30 L57 30 Z"
        fill={windowColor}
      />

      {/* ── النافذة الخلفية (أوسع لتوازن بصري) ── */}
      <path
        d="M32 12 L56 12 L56 30 L34 30 L28 15 Q30 11 32 12 Z"
        fill={windowColor}
      />

      {/* ── فاصل النوافذ (عمودي واضح) ── */}
      <rect x="55.5" y="10.5" width="2" height="19.5" fill={windowColor} rx="1" />

      {/* ── حد إطار النافذة (يساعد على الوضوح عند 24px) ── */}
      <path
        d="M20 33 L28 15 Q30 10 36 10 L64 10 Q70 10 72 15 L80 33"
        stroke={windowColor}
        strokeWidth="0.8"
        fill="none"
      />

      {/* ── العجلة الأمامية ── */}
      <circle cx="74" cy="51" r="10.5" fill="hsl(20 22% 6%)" />
      <circle cx="74" cy="51" r="7.5"  fill="hsl(20 22% 9%)" />
      <circle cx="74" cy="51" r="4.5"  fill={wheelRim} />
      {/* براغي العجلة */}
      <circle cx="74" cy="46.5" r="1.2" fill={wheelHub} />
      <circle cx="74" cy="55.5" r="1.2" fill={wheelHub} />
      <circle cx="69.5" cy="51"  r="1.2" fill={wheelHub} />
      <circle cx="78.5" cy="51"  r="1.2" fill={wheelHub} />
      {/* مركز العجلة */}
      <circle cx="74" cy="51" r="2" fill={wheelHub} />

      {/* ── العجلة الخلفية ── */}
      <circle cx="26" cy="51" r="10.5" fill="hsl(20 22% 6%)" />
      <circle cx="26" cy="51" r="7.5"  fill="hsl(20 22% 9%)" />
      <circle cx="26" cy="51" r="4.5"  fill={wheelRim} />
      <circle cx="26" cy="46.5" r="1.2" fill={wheelHub} />
      <circle cx="26" cy="55.5" r="1.2" fill={wheelHub} />
      <circle cx="21.5" cy="51"  r="1.2" fill={wheelHub} />
      <circle cx="30.5" cy="51"  r="1.2" fill={wheelHub} />
      <circle cx="26" cy="51" r="2" fill={wheelHub} />

      {/* ── مصباح أمامي (أكبر وأوضح) ── */}
      <rect x="91" y="33" width="7" height="8" rx="3" fill="rgba(255,230,100,0.95)" />
      {/* هالة المصباح */}
      <rect x="91" y="33" width="7" height="8" rx="3" fill="rgba(255,230,100,0.3)"
            transform="scale(1.3) translate(-7, -4)" />

      {/* ── مصباح خلفي ── */}
      <rect x="2" y="33" width="6" height="8" rx="2.5" fill="rgba(255,60,60,0.90)" />

      {/* ── شبكة/مصد أمامي ── */}
      <rect x="90" y="43" width="7" height="4.5" rx="2" fill="rgba(255,255,255,0.18)" />

      {/* ── خط الزجاج السفلي / حد النوافذ السفلي ── */}
      <rect x="20" y="31.5" width="60" height="1.5" fill={windowColor} rx="0.75" />
    </svg>
  );
};

export default CarLogo;
