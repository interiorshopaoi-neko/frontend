import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import estimateRoutes from './routes/estimates';
import photoRoutes from './routes/photos';
import { authenticate } from './middleware/auth';
import { getUnreadCount, markAllRead } from './notifications';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/estimates', photoRoutes);

app.get('/api/notifications/unread-count', authenticate, (req, res) => {
  res.json({ count: getUnreadCount(req.user!.id) });
});

app.post('/api/notifications/read-all', authenticate, (req, res) => {
  markAllRead(req.user!.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
