import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, createSession, clearSessionCookie, AuthedRequest } from '../lib/auth';
import { logAudit } from '../lib/helpers';
import crypto from 'crypto';
import { createPasswordResetCode, hashPasswordResetCode, PasswordResetChannel, sendPasswordResetCode } from '../lib/password-reset';

function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function invitationTokenHash(token: string): string {
  return hashInvitationToken(token);
}

const router = Router();

router.get('/merchant-invitations/:token', async (req, res) => {
  const invitation = await prisma.merchantInvitation.findFirst({
    where: { tokenHash: hashInvitationToken(req.params.token), usedAt: null, expiresAt: { gt: new Date() } },
    select: { name: true, email: true, expiresAt: true },
  });
  if (!invitation) return void res.status(404).json({ message: 'الدعوة غير صالحة أو انتهت' });
  res.json({ invitation });
});

router.post('/merchant-invitations/:token/accept', async (req, res) => {
  const parsed = z.object({
    name: z.string().min(2).max(80),
    phone: z.string().regex(/^01[0-9]{9}$/),
    password: z.string().min(12),
  }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'الاسم ورقم الموبايل وكلمة مرور قوية مطلوبة' });

  const tokenHash = hashInvitationToken(req.params.token);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.merchantInvitation.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } } });
      if (!invitation) throw new Error('INVITATION_INVALID');
      const exists = await tx.user.findFirst({ where: { OR: [{ phone: parsed.data.phone }, { email: invitation.email }] } });
      if (exists) throw new Error('ACCOUNT_EXISTS');
      const claimed = await tx.merchantInvitation.updateMany({ where: { id: invitation.id, usedAt: null }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new Error('INVITATION_USED');
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const user = await tx.user.create({ data: { name: parsed.data.name, phone: parsed.data.phone, email: invitation.email, passwordHash, role: 'MERCHANT' } });
      await tx.merchant.create({ data: { userId: user.id, name: parsed.data.name } });
      return user;
    });
    await createSession(req, res, result);
    res.status(201).json({ user: publicUser(result) });
  } catch (error: any) {
    if (error?.message === 'ACCOUNT_EXISTS') return void res.status(409).json({ message: 'الحساب مستخدم بالفعل' });
    if (error?.message === 'INVITATION_USED') return void res.status(409).json({ message: 'الدعوة استُخدمت بالفعل' });
    if (error?.message === 'INVITATION_INVALID') return void res.status(410).json({ message: 'الدعوة غير صالحة أو انتهت' });
    throw error;
  }
});

router.get('/customer-activation/:token', async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { activationTokenHash: hashInvitationToken(req.params.token), mustSetPassword: true, activationTokenExpiresAt: { gt: new Date() } },
    select: { name: true, phone: true, activationTokenExpiresAt: true },
  });
  if (!user) return void res.status(404).json({ message: 'رابط التفعيل غير صالح أو انتهت صلاحيته' });
  res.json({ customer: user });
});

router.post('/customer-activation/:token/accept', async (req, res) => {
  const parsed = z.object({ password: z.string().min(12) }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'كلمة المرور لازم تكون 12 حرف على الأقل' });
  const tokenHash = hashInvitationToken(req.params.token);
  const user = await prisma.user.findFirst({ where: { activationTokenHash: tokenHash, mustSetPassword: true, activationTokenExpiresAt: { gt: new Date() } } });
  if (!user) return void res.status(410).json({ message: 'رابط التفعيل غير صالح أو انتهت صلاحيته' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const updated = await prisma.user.updateMany({
    where: { id: user.id, activationTokenHash: tokenHash, mustSetPassword: true },
    data: { passwordHash, mustSetPassword: false, activationTokenHash: null, activationTokenExpiresAt: null },
  });
  if (updated.count !== 1) return void res.status(409).json({ message: 'رابط التفعيل استُخدم بالفعل' });
  const activated = { ...user, passwordHash, mustSetPassword: false };
  await createSession(req, res, activated);
  res.status(201).json({ user: publicUser(activated) });
});

const registerSchema = z.object({
  name: z.string().min(2, 'short') .max(80),
  phone: z.string().regex(/^01[0-9]{9}$/, 'invalid'),
  password: z.string().min(12, 'كلمة المرور لازم تكون 12 حرف على الأقل'),
  email: z.string().email().optional(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message });
   const { name, phone, password, email } = parsed.data;
   const exists = await prisma.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } });
  if (exists) return void res.status(409).json({ message: 'رقم الموبايل مسجل بالفعل' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, phone, email, passwordHash, role: 'CUSTOMER', source: 'DIRECT' } });
 await logAudit({ actor: user, action: 'auth.register', entityType: 'User', entityId: user.id });
 await createSession(req, res, user);
 res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({ identifier: z.string().min(1).optional(), phone: z.string().min(1).optional(), password: z.string().min(1) }).refine((data) => data.identifier || data.phone, { message: 'برجاء إدخال البريد أو رقم الموبايل' });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'برجاء إدخال البريد أو رقم الموبايل وكلمة المرور' });
  const identifier = parsed.data.identifier ?? parsed.data.phone!;
  const { password } = parsed.data;
  const user = await prisma.user.findFirst({ where: { OR: [{ phone: identifier }, { email: identifier }] }, include: { merchant: true } });
  if (!user || !user.isActive) return void res.status(401).json({ message: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return void res.status(401).json({ message: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
 await createSession(req, res, user);
 await logAudit({ actor: user, action: 'auth.login', entityType: 'User', entityId: user.id });
  res.json({ user: publicUser(user, user.merchant ?? undefined) });
});

router.post('/password-reset/request', async (req, res, next) => {
  const parsed = z.object({
    identifier: z.string().min(1),
    channel: z.enum(['email', 'sms']),
  }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'اكتب البريد أو رقم الموبايل واختار طريقة الاستلام' });

  const user = await prisma.user.findFirst({ where: { OR: [{ phone: parsed.data.identifier }, { email: parsed.data.identifier }] } });
  if (!user || !user.isActive) return void res.status(202).json({ message: 'لو البيانات صحيحة، هيوصلك كود الاستعادة.' });
  if (parsed.data.channel === 'email' && !user.email) return void res.status(400).json({ message: 'الحساب ده مفيهوش بريد إلكتروني مسجل' });

  const code = createPasswordResetCode();
  try {
    await sendPasswordResetCode({
      channel: parsed.data.channel as PasswordResetChannel,
      destination: parsed.data.channel === 'email' ? user.email! : user.phone,
      name: user.name,
      code,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: hashPasswordResetCode(code), passwordResetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });
  } catch (error: any) {
    if (error?.message === 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED' || error?.message === 'PASSWORD_RESET_SMS_NOT_CONFIGURED') {
      return void res.status(503).json({ message: 'خدمة استعادة كلمة المرور غير مفعلة حالياً' });
    }
    return next(error);
  }
  res.status(202).json({ message: 'لو البيانات صحيحة، هيوصلك كود الاستعادة.' });
});

router.post('/password-reset/confirm', async (req, res) => {
  const parsed = z.object({ identifier: z.string().min(1), code: z.string().regex(/^\d{6}$/), password: z.string().min(12) }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'اكتب كود صحيح وكلمة مرور 12 حرف على الأقل' });
  const user = await prisma.user.findFirst({ where: { OR: [{ phone: parsed.data.identifier }, { email: parsed.data.identifier }] } });
  if (!user || user.passwordResetTokenHash !== hashPasswordResetCode(parsed.data.code) || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
    return void res.status(400).json({ message: 'الكود غير صحيح أو انتهت صلاحيته' });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordResetTokenHash: null, passwordResetTokenExpiresAt: null, mustSetPassword: false } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  res.json({ ok: true });
});

router.patch('/password', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ currentPassword: z.string().min(1), password: z.string().min(12) }).safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'كلمة المرور الجديدة لازم تكون 12 حرف على الأقل' });
  if (!await bcrypt.compare(parsed.data.currentPassword, req.user!.passwordHash)) return void res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash, mustSetPassword: false } });
  await prisma.session.deleteMany({ where: { userId: req.user!.id, id: { not: req.session!.id } } });
  res.json({ ok: true });
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

router.get('/points', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { points: true },
  });
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ points: user?.points ?? 0, transactions });
});

function publicUser(user: any, merchant?: any) {
 return {
   id: user.id,
   phone: user.phone,
   email: user.email ?? null,
   name: user.name,
   role: user.role,
   isActive: user.isActive,
   points: user.points ?? 0,
   source: user.source ?? 'DIRECT',
   merchantId: user.merchantId ?? null,
   merchant: merchant ? { id: merchant.id, name: merchant.name } : undefined,
 };
}

export default router;
