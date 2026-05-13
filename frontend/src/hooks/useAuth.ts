import { useState, useEffect } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    // Supabase セッションを破棄（エラーでも続行）
    try { await supabase.auth.signOut(); } catch {}
    // 職人関連の localStorage キーを削除
    // ※ promatch_referral_code は紹介流入用なので残す
    // ※ promatch_last_request_id は顧客側なので残す
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('craftsman_user_id');
    setUser(null);
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return { user, login, logout };
}
