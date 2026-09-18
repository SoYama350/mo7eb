import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthedRequest } from '../lib/auth';
import { logAudit } from '../lib/helpers';
import { z } from 'zod';

const router = Router();

// ── Public catalog ─────────────────────────────
router.get('/providers', async (_req, res) => {
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: { packages: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
  });
  res.json({ providers });
});

router.get('/packages', async (_req, res) => {
  const packages = await prisma.package.findMany({
    where: { isActive: true },
    include: { provider: true },
    orderBy: { price: 'asc' },
  });
  res.json({ packages });
});

router.get('/payment-methods', async (_req, res) => {
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json({ paymentMethods: methods });
});

// ── Admin CRUD — providers ─────────────────────
const providerSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

router.use('/admin', requireAuth, requireRole("ADMIN"));

router.get('/admin/providers', async (_req, res) => {
  const providers = await prisma.provider.findMany({ orderBy: { order: 'asc' }, include: { packages: true } } );
  res.json({ providers });
});

router.post('/admin/providers', async (req: AuthedRequest, res) => {
  const parsed = providerSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'بيانات غير صحيحة' });
  const provider = await prisma.provider.create({ data: parsed.data });
  await logAudit({ actor: req.user!, action: 'provider.create', entityType: 'Provider', entityId: provider.id });
  res.status(201).json({ provider });
});

router.patch('/admin/providers/:id', async (req: AuthedRequest, res) => {
  const parsed = providerSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'بيانات غير صحيحة' });
  const provider = await prisma.provider.update({ where: { id: req.params.id }, data: parsed.data });
  await logAudit({ actor: req.user!, action: 'provider.update', entityType: 'Provider', entityId: provider.id, details: JSON.stringify(parsed.data) });
  res.json({ provider });
});

router.delete('/admin/providers/:id', async (req: AuthedRequest, res) => {
  await prisma.provider.delete({ where: { id: req.params.id } });
  await logAudit({ actor: req.user!, action: 'provider.delete', entityType: 'Provider', entityId: req.params.id });
  res.json({ ok: true });
});

// ── Admin CRUD — packages ──────────────────────
const packageSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(2),
  internetGB: z.number().min(0).max(9999),
  minutes: z.number().min(0).max(999999),
  price: z.number().min(0),
  durationDays: z.number().min(1).max(3650),
  reminderDays: z.number().min(0).max(60).default(3),
  isActive: z.boolean().optional(),
});

router.get('/admin/packages', async (_req, res) => {
  const packages = await prisma.package.findMany({ include: { provider: true }, orderBy: { createdAt: 'desc' } } );
  res.json({ packages });
});

router.post('/admin/packages', async (req: AuthedRequest, res) => {
  const parsed = packageSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' });
  const pkg = await prisma.package.create({ data: parsed.data });
  await logAudit({ actor: req.user!, action: 'package.create', entityType: 'Package', entityId: pkg.id });
  res.status(201).json({ package: pkg });
});

router.patch('/admin/packages/:id', async (req: AuthedRequest, res) => {
  const parsed = packageSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'بيانات غير صحيحة' });
  const pkg = await prisma.package.update({ where: { id: req.params.id }, data: parsed.data });
  await logAudit({ actor: req.user!, action: 'package.update', entityType: 'Package', entityId: pkg.id, details: JSON.stringify(parsed.data) });
  res.json({ package: pkg });
});

router.delete('/admin/packages/:id', async (req: AuthedRequest, res) => {
  await prisma.package.delete({ where: { id: req.params.id } });
  await logAudit({ actor: req.user!, action: 'package.delete', entityType: 'Package', entityId: req.params.id });
  res.json({ ok: true });
});

// ── Admin CRUD — payment methods ────────────────
const methodSchema = z.object({
  name: z.string().min(2),
  accountIdentifier: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

router.get('/admin/payment-methods', async (_req, res) => {
  const methods = await prisma.paymentMethod.findMany({ orderBy: { sortOrder: 'asc' } } );
  res.json({ paymentMethods: methods });
});

router.post('/admin/payment-methods', async (req, res) => {
  const parsed = methodSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'بيانات غير صحيحة' });
  const method = await prisma.paymentMethod.create({ data: parsed.data });
  res.json({ paymentMethod: method });
});

router.patch('/admin/payment-methods/:id', async (req: AuthedRequest, res) => {
  const parsed = methodSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ message: 'بيانات غير صحيحة' });
  const method = await prisma.paymentMethod.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ paymentMethod: method });
});

router.delete('/admin/payment-methods/:id', async (req: AuthedRequest, res) => {
  await prisma.paymentMethod.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
