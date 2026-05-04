import db from './db/database';

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    estimate_id INTEGER REFERENCES estimates(id),
    type TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function createNotification(
  userId: number,
  estimateId: number,
  type: 'photo_uploaded' | 'confirmed' | 'rejected'
) {
  db.prepare(
    'INSERT INTO notifications (user_id, estimate_id, type) VALUES (?, ?, ?)'
  ).run(userId, estimateId, type);
}

export function getUnreadCount(userId: number): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
  ).get(userId) as { count: number };
  return row.count;
}

export function markAllRead(userId: number) {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
}
