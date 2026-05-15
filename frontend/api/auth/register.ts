// ================================================================
// POST /api/auth/register
//
// Supabase Auth でユーザー登録し { token, user } を返す。
// メール確認が必要な場合は { requiresConfirmation: true } を返す。
//
// Body:   { name, email, password, role: 'customer'|'craftsman' }
// Return: { token, user } | { requiresConfirmation, message }
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

  const { name, email, password, role } = req.body ?? {};
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: '全項目を入力してください' });
    return;
  }
  if (!['customer', 'craftsman'].includes(role)) {
    res.status(400).json({ error: '無効なロールです' });
    return;
  }

  try {
    const sbRes = await fetch(
      `${SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          data: { name, role, email_verified: false },
        }),
      }
    );

    const data = await sbRes.json().catch(() => ({}));

    if (!sbRes.ok) {
      // already registered
      if (
        data.code === 'user_already_exists' ||
        (data.msg ?? '').includes('already') ||
        (data.error_description ?? '').includes('already')
      ) {
        res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
        return;
      }
      res.status(400).json({
        error: data.error_description || data.msg || '登録に失敗しました',
      });
      return;
    }

    // メール確認が必要な場合: access_token が null になる
    const token = data.access_token ?? data.session?.access_token ?? null;
    if (!token) {
      res.status(200).json({
        requiresConfirmation: true,
        message:
          '確認メールを送信しました。受信ボックスを確認し、リンクをクリックしてからログインしてください。',
      });
      return;
    }

    res.status(200).json({
      token,
      user: {
        id:    data.user.id,
        name,
        email: data.user.email,
        role,
      },
    });
  } catch (err) {
    console.error('[auth/register] unexpected error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
