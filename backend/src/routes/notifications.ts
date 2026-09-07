import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../lib/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: req.user!.id }, { role: req.user!.role }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;
  res.json({ notifications, unread });
});

router.post('/read-all', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { OR: [{ userId: req.user!.id }, { role: req.user!.role }] },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;