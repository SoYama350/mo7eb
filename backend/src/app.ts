import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import { router as subscriptionRouter } from './routes/subscriptions';
import paymentRoutes from './routes/payments';
import merchantRoutes from './routes/merchant';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import { runExpiryJob } from './jobs/expiry';
import { requireAuth, requireRole } from './lib/auth';
import { allowedOrigins } from './config';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const configuredOrigins = allowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.trim().replace(/\/+$/, '');

      if (configuredOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// rate limiting on auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'طلبات كتيرة. جرب بعد شوية.' },
});
app.use('/api/v1/auth', authLimiter);

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/', catalogRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/subscriptions', subscriptionRouter);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/merchant', merchantRoutes);
apiRouter.use('/admin', adminRoutes);

// jobs trigger (for demo / manual run)
apiRouter.post('/jobs/run', requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const results = await runExpiryJob('manual');
  res.json({ results });
});

app.use('/api/v1', apiRouter);

// 404 + error handler
app.use((req, res) => {
  res.status(404).json({ message: `مفيش endpoint: ${req.method} ${req.path}` });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'حصل خطأ غير متوقع' });
});

export default app;
