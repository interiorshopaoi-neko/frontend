import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, requireRole } from '../middleware/auth';
import db from '../db/database';
import { createNotification } from '../notifications';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post('/:id/photos', authenticate, requireRole('customer'), upload.array('photos', 5), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    res.status(400).json({ error: '写真を選択してください' });
    return;
  }

  const estimate = db.prepare('SELECT * FROM estimates WHERE id = ? AND customer_id = ?').get(req.params.id, req.user!.id) as any;
  if (!estimate) {
    res.status(404).json({ error: '見積もりが見つかりません' });
    return;
  }

  const insert = db.prepare('INSERT INTO photos (estimate_id, filename) VALUES (?, ?)');
  for (const file of files) {
    insert.run(req.params.id, file.filename);
  }

  db.prepare("UPDATE estimates SET status = 'photo_uploaded', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

  const craftsmen = db.prepare("SELECT id FROM users WHERE role = 'craftsman'").all() as { id: number }[];
  craftsmen.forEach(c => createNotification(c.id, Number(req.params.id), 'photo_uploaded'));

  res.json({ uploaded: files.length });
});

export default router;
