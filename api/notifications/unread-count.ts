// GET /api/notifications/unread-count
// 通知システムが Supabase に未移行のため、暫定的に 0 を返す。
// Layout.tsx の useUnreadCount が 30 秒ごとにポーリングするため 404 を避ける。

export default function handler(_req: any, res: any) {
  res.status(200).json({ count: 0 });
}
