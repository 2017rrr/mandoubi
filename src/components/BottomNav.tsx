import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

export const BottomNav = ({ items }: { items: NavItem[] }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all min-w-0 flex-1 relative">
            {/* مؤشر نشط */}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'hsl(24 94% 55%)' }} />
            )}
            <span className={`text-xl transition-transform ${isActive ? 'scale-110' : 'scale-100 opacity-60'}`}>
              {item.icon}
            </span>
            <span className={`text-[9px] font-bold truncate max-w-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
