import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export const BottomNav = ({ items }: BottomNavProps) => {
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
            className={`flex flex-col items-center gap-0.5 px-1 py-1 transition-colors min-w-0 flex-1 ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[9px] font-medium truncate max-w-full">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
