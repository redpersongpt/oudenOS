import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { closeDb } from './db/index.js';
import adminRoutes from './routes/admin.js';
import licenseRoutes from './routes/license.js';
import updateRoutes from './routes/updates.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  requestTimeout: 30_000,
  bodyLimit: 5 * 1024 * 1024,
});

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'app://',
];

const extraOrigins = process.env.ALLOWED_ORIGINS;
if (extraOrigins) {
  allowedOrigins.push(...extraOrigins.split(',').map((o) => o.trim()));
}

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: false, // API-only, no HTML served
});

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', async (_request, reply) => {
  return reply.send({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// Route plugins — all under /v1 prefix
// ---------------------------------------------------------------------------

await app.register(
  async function v1Routes(v1) {
    await v1.register(adminRoutes, { prefix: '/admin' });
    await v1.register(licenseRoutes, { prefix: '/license' });
    await v1.register(updateRoutes, { prefix: '/updates' });
  },
  { prefix: '/v1' },
);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.setNotFoundHandler((_request, reply) => {
  return reply.status(404).send({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.setErrorHandler((error, _request, reply) => {
  const err = error as { statusCode?: number; message?: string };
  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    app.log.error(error);
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: statusCode >= 500 ? 'SRV_500' : `ERR_${statusCode}`,
      message: statusCode >= 500 ? 'Internal server error' : (err.message ?? 'Unknown error'),
    },
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await app.close();
    await closeDb();
    app.log.info('Server closed');
    process.exit(0);
  } catch (shutdownErr) {
    app.log.error({ err: shutdownErr }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

try {
  await app.listen({ port, host });
  app.log.info(`redcore-OS cloud API running on http://${host}:${port}`);
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}
