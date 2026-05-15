// ================================================================
// POST /api/auth/login
//
// Supabase Auth を使ってメール+パスワードでログインし、
// フロントエンドが期待する { token, user } 形式で返す。
//
// Body:   { email: string, password: string }
// Return: { token: string, user: { id, name, email, role } }
//         or { error: string }
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
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
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
      const err = await sbRes.json().catch(() => ({}));
      const msg =
        err.error_description ||
        err.msg ||
        'メールアドレスまたはパスワードが違います';
      res.status(401).json({ error: msg });
      return;
    }

    const data = await sbRes.json();
    const meta = (data.user?.user_metadata ?? {}) as Record<string, string>;

    const role =
      meta.role === 'craftsman'
        ? 'craftsman'
        : meta.role === 'admin'
        ? 'admin'
        : 'customer';
    const name = meta.name || meta.full_name || email;

    res.status(200).json({
      token: data.access_token,
      user: {
        id:    data.user.id,   // UUID string
        name,
        email: data.user.email,
        role,
      },
    });
  } catch (err) {
    console.error('[auth/login] unexpected error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
