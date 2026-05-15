import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';
import type { User } from '../types';
import api from '../utils/api';
import { useLangContext } from '../context/LangContext';
import LangSwitcher from './LangSwitcher';
interface Props {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}

function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetch = () => api.get('/notifications/unread-count').then(({ data }) => setCount(data.count)).catch(() => {});
    fetch();
    const timer = setInterval(fetch, 30000);
    return () => clearInterval(timer);
  }, []);
  return count;
}

export default function Layout({ user, onLogout, children }: Props) {
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const { t } = useLangContext();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(user.role === 'customer' ? '/customer' : '/craftsman/dashboard')}
          >
            <img src="/logo-icon.png" alt="PRO MATCH" className="h-7 w-7 object-contain" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {user.name}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                user.role === 'craftsman' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {user.role === 'craftsman' ? '職人' : t('role_customer')}
              </span>
            </span>
            <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut size={18} />
            </button>
            <LangSwitcher />
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
