import crypto from 'crypto';
import { Response, Request, NextFunction } from 'express';
import { prisma } from './prisma';
import { User, Session } from '@prisma/client';

export type Role = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

const SESSION_COOKIE = 'tsid';
const SESSION_DAYS = 30;

export function hashToken(value: string): string {
  const secret = process.env.APP_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('APP_SECRET is required in production');
  return crypto.createHmac('sha256', secret || 'dev').update(value).digest('hex');
}

export function sessionCookieName(): string { return SESSION_COOKIE; }

export function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

export interface AuthedRequest extends Request {
  user?: User;
  session?: Session;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = (req.cookies as Record<string, string>)?.[SESSION_COOKIE];
    if (!token) return void res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return void res.status(401).json({ message: 'الجلسة انتهت. سجل دخول تاني' });
    }
    req.user = session.user;
    req.session = session;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return void res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    if (!roles.includes(req.user.role as Role)) {
      return void res.status(403).json({ message: 'مش مسموح ليك تفتح الصفحة دي' });
    }
    next();
  };
}

export function roleToEnum(role: string): Role | null {
  const map: Record<string, Role> = { customer: "CUSTOMER", merchant: "MERCHANT", admin: "ADMIN" };
  return map[role.toLowerCase()] ?? null;
}

export async function createSession(req: Request, res: Response, user: User) {
  const token = crypto.randomBytes(32).toString('hex');
  const days = SESSION_DAYS;
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + days * 24 * 3600 * 1000),
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 200),
    },
  });
  setSessionCookie(res, token);
}
