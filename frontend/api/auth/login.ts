// ================================================================
// POST /api/auth/login
//
// Supabase Auth を使ってメール+パスワードでログインし、
// フロントエンドが期待する { token, user } 形式で返す。
//
// Body:   { email: string, password: string }
// Return: { token: string, user: { id, name, email, role } }
//         or { error: string, reason: string }
//
// reason 分類（Vercel Logs で検索可能）:
//   invalid_credentials   — パスワード誤り / アカウント未存在
//   email_not_confirmed   — メール確認未完了
//   supabase_auth_error   — その他の Supabase auth エラー
//   missing_user          — Supabase が user を返さなかった
//   server_error          — 予期しない例外
// ================================================================

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://lboskhjidbqxwrenwjdr.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_v2U-RibzTmtIOJnY3f5pyw_aRDL4dJG';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed', reason: 'method_not_allowed' });
    return;
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'メールアドレスとパスワードを入力してください', reason: 'missing_fields' });
    return;
  }

  try {
    const sbRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!sbRes.ok) {
      const sbErr = await sbRes.json().catch(() => ({}));

      // Vercel Logs で原因を追跡できるよう構造化ログを出す（password は含めない）
      console.error('[auth/login] Supabase auth failed', {
        email,
        status:            sbRes.status,
        supabase_error:    sbErr.error             ?? null,
        error_description: sbErr.error_description ?? null,
        error_code:        sbErr.error_code        ?? null,
        msg:               sbErr.msg               ?? null,
      });

      // reason を分類して返す
      const errorCode = sbErr.error ?? sbErr.error_code ?? '';
      const errorDesc = (sbErr.error_description ?? sbErr.msg ?? '').toLowerCase();

      if (
        errorCode === 'email_not_confirmed' ||
        errorDesc.includes('email not confirmed') ||
        errorDesc.includes('email_not_confirmed')
      ) {
        res.status(401).json({
          error:  'email_not_confirmed',
          reason: 'email_not_confirmed',
        });
        return;
      }

      if (
        errorCode === 'invalid_credentials' ||
        errorDesc.includes('invalid login') ||
        errorDesc.includes('invalid credentials') ||
        sbRes.status === 400 ||
        sbRes.status === 401
      ) {
        res.status(401).json({
          error:  'invalid_credentials',
          reason: 'invalid_credentials',
        });
        return;
      }

      res.status(401).json({
        error:  'supabase_auth_error',
        reason: 'supabase_auth_error',
      });
      return;
    }

    const data = await sbRes.json();

    // data.user が null の場合を安全に処理（TypeError を防ぐ）
    if (!data.user || !data.user.id) {
      console.error('[auth/login] Supabase returned no user', {
        email,
        has_access_token: !!data.access_token,
        user_value:       data.user ?? null,
      });
      res.status(500).json({
        error:  'missing_user',
        reason: 'missing_user',
      });
      return;
    }

    const meta = (data.user.user_metadata ?? {}) as Record<string, string>;

    const role =
      meta.role === 'craftsman'
        ? 'craftsman'
        : meta.role === 'admin'
        ? 'admin'
        : 'customer';
    const name = meta.name || meta.full_name || email;

    console.log('[auth/login] success', { email, role });

    res.status(200).json({
      token: data.access_token,
      user: {
        id:    data.user.id,
        name,
        email: data.user.email,
        role,
      },
    });
  } catch (err) {
    console.error('[auth/login] unexpected error', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error:  'server_error',
      reason: 'server_error',
    });
  }
}
