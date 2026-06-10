import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem { icon: string; label: string; path: string; }

export const BottomNav = ({ items }: { items: NavItem[] }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all duration-200"
          >
            {/* خلفية العنصر النشط */}
            {isActive && (
              <div
                className="absolute inset-x-2 inset-y-1 rounded-xl"
                style={{ background: 'hsl(22 100% 55% / 0.1)' }}
              />
            )}
            {/* أيقونة */}
            <span
              className="text-xl relative z-10 transition-transform duration-200"
              style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)', filter: isActive ? 'none' : 'grayscale(0.3) opacity(0.5)' }}
            >
              {item.icon}
            </span>
            {/* النص */}
            <span
              className="text-[10px] font-bold relative z-10 transition-colors"
              style={{ color: isActive ? 'hsl(22 100% 60%)' : 'hsl(20 10% 45%)' }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
