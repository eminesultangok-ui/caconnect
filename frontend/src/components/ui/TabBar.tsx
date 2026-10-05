/**
 * TabBar — Self-contained fixed bottom tab bar for mobile navigation.
 * Owns its own navigation via useNavigate.
 * Derives active tab from useLocation().pathname.
 * Tabs: Dashboard, Search, Alerts, History.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Bell, ListChecks } from 'lucide-react';

interface TabBarProps {
  alertsCount?: number;
}

const TABS = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'search' as const,    label: 'Search',    icon: Search },
  { key: 'alerts' as const,    label: 'Alerts',    icon: Bell },
  { key: 'history' as const,   label: 'History',   icon: ListChecks },
];

export default function TabBar({ alertsCount = 0 }: TabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from current pathname
  const activeKey =
    location.pathname === '/history' ? 'history' :
    location.pathname === '/search'  ? 'search' :
    location.pathname === '/alerts'  ? 'alerts' :
    'dashboard';

  const handleClick = (key: string) => {
    if (key === 'dashboard') navigate('/dashboard');
    if (key === 'history') navigate('/history');
    if (key === 'alerts') navigate('/alerts');
    if (key === 'search') navigate('/search');
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-neutral-200 z-50">
      <div className="flex items-center justify-around py-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive
                  ? 'text-brand-blue font-semibold'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                {key === 'alerts' && alertsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-danger text-white text-[10px] font-bold leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {alertsCount > 99 ? '99+' : alertsCount}
                  </span>
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}