import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, createSession, clearSessionCookie, AuthedRequest } from '../lib/auth';
import { logAudit } from '../lib/helpers';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'short') .max(80),
  phone: z.string().regex(/^01[0-9]{9}$/, 'invalid'),
  password: z.string().min(6, 'weak'),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message });
  const { name, phone, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { phone } });
 if (exists) return void res.status(409).json({ message: 'exists' });
 const passwordHash = await bcrypt.hash(password, 10);
 const user = await prisma.user.create({ data: { name, phone, passwordHash, role: 'CUSTOMER', source: 'DIRECT' } });
 await logAudit({ actor: user, action: 'auth.register', entityType: 'User', entityId: user.id });
 await createSession(req, res, user);
 res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({ phone: z.string().min(1), password: z.string().min(1) });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'bad' });
  const { phone, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { phone }, include: { merchant: true } });
 if (!user || !user.isActive) return void res.status(401).json({ message: 'bad creds' });
 const ok = await bcrypt.compare(password, user.passwordHash);
 if (!ok) return void res.status(401).json({ message: 'bad creds' });
 await createSession(req, res, user);
 await logAudit({ actor: user, action: 'auth.login', entityType: 'User', entityId: user.id });
 res.json({ user: publicUser(user, user.merchant ?? undefined) });
});

router.post('/logout', requireAuth, async (req: AuthedRequest, res) => {
  if (req.session) await prisma.session.delete({ where: { id: req.session.id } }).catch(() => undefined);
 await logAudit({ actor: req.user!, action: 'auth.logout', entityType: 'User', entityId: req.user!.id });
 clearSessionCookie(res);
 res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
   const full = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { merchant: true } });
  res.json({ user: publicUser(full!, full!.merchant ?? undefined) });
});

router.patch('/me', requireAuth, async (req: AuthedRequest, res) => {
   const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
  if (!name) return void res.status(400).json({ message: 'name required' });
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { name } });
 res.json({ user: publicUser(user) });
});

function publicUser(user: any, merchant?: any) {
 return {
   id: user.id,
   phone: user.phone,
   name: user.name,
   role: user.role,
   isActive: user.isActive,
   source: user.source ?? 'DIRECT',
   merchantId: user.merchantId ?? null,
   merchant: merchant ? { id: merchant.id, name: merchant.name } : undefined,
 };
}

export default router;
