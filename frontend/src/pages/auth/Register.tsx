import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import type { User, Role } from '../../types';
import api from '../../utils/api';
import { useLangContext } from '../../context/LangContext';
import LangSwitcher from '../../components/LangSwitcher';
import Logo from '../../components/Logo';

interface Props {
  onLogin: (token: string, user: User) => void;
}

export default function Register({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLangContext();
  // If came from landing page estimate CTA, send new customers straight to the flow
  const fromLanding = (location.state as any)?.fromLanding === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // TODO: 本番APIに差し替える
      // const { data } = await api.post('/auth/register', { name, email, password, role });
      // onLogin(data.token, data.user);
      console.log('[mock] register success', { name, email, role });
      const mockUser = { id: 0, name, email, role } as import('../../types').User;
      onLogin('mock-token', mockUser);
      if (role === 'customer' && fromLanding) {
        navigate('/customer/estimate/flow');
      } else {
        navigate(role === 'customer' ? '/customer' : '/craftsman');
      }
    } catch (err: any) {
      console.error('[mock] register error', err);
      // TODO: 本番実装時に有効化
      // setError(err.response?.data?.error ?? t('register_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="fixed top-3 right-3 z-50"><LangSwitcher /></div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size={36} />
          </div>
          <p className="text-slate-500 text-sm">{t('tagline')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">{t('register_title')}</h2>

          {/* ロール選択 */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(['customer', 'craftsman'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  role === r
                    ? r === 'craftsman'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {r === 'customer' ? t('role_customer') : t('craftsman_role')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('name_label')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="6文字以上"
              />
            </div>
            {/* TODO: 本番実装時に有効化 */}
            {/* {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )} */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? t('registering') : t('register_btn')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('have_account')}{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
