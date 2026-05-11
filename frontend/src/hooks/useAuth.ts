import { useState, useEffect } from 'react';
import type { User, Role } from '../types';
import { supabase } from '../lib/supabase';

// localStorage.user / localStorage.token は既存形式（{id, name, email, role} と
// access_token 文字列）を完全互換維持する。Phase1 では id を Supabase Auth の
// UUID v4 に置き換えるが、JSON 上は文字列なので consumer 側に破壊的変更はない。

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStored(user: User, token: string) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearStored() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Supabase session の user → 既存 User 形式に変換。
// role は user_metadata 優先、なければ localStorage の値で fallback。
function userFromSession(
  authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null },
  fallback: User | null,
): User {
  const meta = (authUser.user_metadata ?? {}) as { name?: unknown; role?: unknown };
  // admin は user_metadata.role でのみ昇格できる（運営アカウント識別）。
  // fallback は現状維持（customer/craftsman/admin いずれもそのまま通す）。
  const role: Role =
    meta.role === 'craftsman' || meta.role === 'customer' || meta.role === 'admin'
      ? meta.role
      : (fallback?.role ?? 'customer');
  return {
    id: authUser.id,
    name: typeof meta.name === 'string' ? meta.name : (fallback?.name ?? ''),
    email: authUser.email ?? fallback?.email ?? '',
    role,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  // 既存 onLogin signature を完全維持する。
  // Login.tsx / Register.tsx から (token, userData) で呼ばれる。
  const login = (token: string, userData: User) => {
    writeStored(userData, token);
    setUser(userData);
  };

  const logout = () => {
    // Supabase セッションを先に切ってから localStorage を消す。
    // signOut のネットワーク失敗はローカル状態と独立に扱う。
    void supabase.auth.signOut().catch(() => { /* network failure is non-fatal */ });
    clearStored();
    setUser(null);
  };

  useEffect(() => {
    // supabase-js v2 はサブスクライブ時に INITIAL_SESSION を 1 回発火するので、
    // それで初回復元と以降の SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED を一括処理。
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearStored();
        setUser(null);
        return;
      }
      if (session?.user) {
        const next = userFromSession(session.user, readStoredUser());
        writeStored(next, session.access_token);
        setUser(next);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, login, logout };
}
