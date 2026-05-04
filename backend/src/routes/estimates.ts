import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import db from '../db/database';
import { createNotification } from '../notifications';

const router = Router();

// 計算ロジック
const CROSS_MATERIAL: Record<string, number> = { economy: 1050, standard: 1450, premium: 2200 };
const CROSS_CONDITION: Record<string, number> = { good: 1.0, normal: 1.15, bad: 1.3 };
const CF_MATERIAL: Record<string, number> = { economy: 1200, standard: 1800, premium: 2400 };

function calcEstimate(
  workType: string,
  tatamiCount: number,
  condition: string,
  grade: string,
  hasExistingCf: boolean
): { min: number; max: number } {
  let total = 0;

  if (workType === 'cross' || workType === 'both') {
    const wallArea = tatamiCount * 1.62 * 2.4 * 0.85;
    const material = wallArea * (CROSS_MATERIAL[grade] ?? 1450);
    const labor = wallArea * 900 * (CROSS_CONDITION[condition] ?? 1.0);
    total += material + labor + 3000;
  }

  if (workType === 'cf' || workType === 'both') {
    const floorArea = tatamiCount * 1.62;
    const material = floorArea * (CF_MATERIAL[grade] ?? 1800);
    const labor = floorArea * 1200;
    const removal = hasExistingCf ? floorArea * 800 : 0;
    total += material + labor + removal;
  }

  return {
    min: Math.round(total * 0.9 / 100) * 100,
    max: Math.round(total * 1.1 / 100) * 100,
  };
}

// お客様：見積もり作成
router.post('/', authenticate, requireRole('customer'), (req, res) => {
  const { workType, roomName, tatamiCount, condition, grade, hasExistingCf } = req.body;
  const { min, max } = calcEstimate(workType, tatamiCount, condition, grade, hasExistingCf);

  const result = db.prepare(`
    INSERT INTO estimates (customer_id, work_type, room_name, tatami_count, condition, grade, has_existing_cf, auto_min, auto_max)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user!.id, workType, roomName, tatamiCount, condition, grade, hasExistingCf ? 1 : 0, min, max);

  const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(result.lastInsertRowid);
  res.json(estimate);
});

// お客様：自分の見積もり一覧
router.get('/my', authenticate, requireRole('customer'), (req, res) => {
  const estimates = db.prepare(`
    SELECT e.*, GROUP_CONCAT(p.filename) as photo_filenames
    FROM estimates e
    LEFT JOIN photos p ON p.estimate_id = e.id
    WHERE e.customer_id = ?
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `).all(req.user!.id);
  res.json(estimates);
});

// 職人：全見積もり一覧（未確定のもの）
router.get('/craftsman', authenticate, requireRole('craftsman'), (req, res) => {
  const estimates = db.prepare(`
    SELECT e.*, u.name as customer_name, GROUP_CONCAT(p.filename) as photo_filenames
    FROM estimates e
    JOIN users u ON u.id = e.customer_id
    LEFT JOIN photos p ON p.estimate_id = e.id
    GROUP BY e.id
    ORDER BY e.status ASC, e.created_at DESC
  `).all();
  res.json(estimates);
});

// 詳細取得（お客様・職人両方）
router.get('/:id', authenticate, (req, res) => {
  const estimate = db.prepare(`
    SELECT e.*, u.name as customer_name, GROUP_CONCAT(p.filename) as photo_filenames
    FROM estimates e
    JOIN users u ON u.id = e.customer_id
    LEFT JOIN photos p ON p.estimate_id = e.id
    WHERE e.id = ?
    GROUP BY e.id
  `).get(req.params.id) as any;

  if (!estimate) {
    res.status(404).json({ error: '見積もりが見つかりません' });
    return;
  }
  // 自分の見積もりか職人のみアクセス可
  if (req.user!.role === 'customer' && estimate.customer_id !== req.user!.id) {
    res.status(403).json({ error: '権限がありません' });
    return;
  }
  res.json(estimate);
});

// 職人：見積もり確定
router.put('/:id/confirm', authenticate, requireRole('craftsman'), (req, res) => {
  const { finalPrice, craftsmanNote } = req.body;
  const estimateBefore = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id) as any;
  db.prepare(`
    UPDATE estimates SET final_price = ?, craftsman_note = ?, craftsman_id = ?, status = 'confirmed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(finalPrice, craftsmanNote ?? '', req.user!.id, req.params.id);
  createNotification(estimateBefore.customer_id, Number(req.params.id), 'confirmed');

  const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  res.json(estimate);
});

// 職人：要現地確認（rejected扱い）
router.put('/:id/reject', authenticate, requireRole('craftsman'), (req, res) => {
  const { craftsmanNote } = req.body;
  const estimateBefore = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id) as any;
  db.prepare(`
    UPDATE estimates SET craftsman_note = ?, status = 'rejected', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(craftsmanNote ?? '', req.params.id);
  createNotification(estimateBefore.customer_id, Number(req.params.id), 'rejected');

  const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(req.params.id);
  res.json(estimate);
});

// 即決申し込み
router.put('/:id/book', authenticate, requireRole('customer'), (req, res) => {
  const estimate = db.prepare(
    "SELECT * FROM estimates WHERE id = ? AND customer_id = ? AND status = 'confirmed'"
  ).get(req.params.id, req.user!.id);
  if (!estimate) {
    res.status(400).json({ error: '申し込みできない状態です' });
    return;
  }
  db.prepare(
    "UPDATE estimates SET status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(req.params.id);
  res.json({ ok: true });
});

export default router;
