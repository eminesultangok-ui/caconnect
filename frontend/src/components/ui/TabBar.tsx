/**
 * TabBar — Self-contained fixed bottom tab bar for mobile navigation.
 * Owns its own navigation via useNavigate.
 * Derives active tab from useLocation().pathname.
 * Only prop: optional onSearch to focus search field on DashboardPage.
 * Tabs: Dashboard, Search, Alerts (2-sec toast), History.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Search, Bell, ListChecks } from 'lucide-react';

interface TabBarProps {
  onSearch?: () => void;
}

const TABS = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'search' as const,    label: 'Search',    icon: Search },
  { key: 'alerts' as const,    label: 'Alerts',    icon: Bell },
  { key: 'history' as const,   label: 'History',   icon: ListChecks },
];

export default function TabBar({ onSearch }: TabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAlertToast, setShowAlertToast] = useState(false);

  // Derive active tab from current pathname
  const activeKey = location.pathname === '/history' ? 'history' : 'dashboard';

  // Auto-dismiss toast after 2 seconds
  useEffect(() => {
    if (!showAlertToast) return;
    const timer = setTimeout(() => setShowAlertToast(false), 2000);
    return () => clearTimeout(timer);
  }, [showAlertToast]);

  const handleClick = (key: string) => {
    if (key === 'dashboard') navigate('/dashboard');
    if (key === 'history') navigate('/history');
    if (key === 'alerts') setShowAlertToast(true);
    if (key === 'search') {
      if (onSearch) {
        onSearch();
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-neutral-200 z-50">
      {showAlertToast && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          Alerts are not part of this MVP
        </div>
      )}
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
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}