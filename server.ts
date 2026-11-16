import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createApiApp, ensureBackendReady } from './backend/app';
import { dbConfig, assertValidDatabaseConfig } from './backend/database';
import { sanitizeErrorResponse } from './backend/middleware/securityMiddleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  // Validate database configuration fail-fast at startup
  assertValidDatabaseConfig();

  const app = createApiApp({ enableServerlessHydration: false });
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialize and synchronize PostgreSQL database (schema "apmams")
  try {
    await ensureBackendReady({ runSchemaSync: true });
    console.log(`[PostgreSQL] Connected and synchronized with database "${dbConfig.database}", schema "${dbConfig.schema}"`);
  } catch (err: any) {
    console.error('[PostgreSQL] Database synchronization warning:', err.message);
  }

  // Frontend Integration
  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  // Global sanitized production error handler
  app.use(sanitizeErrorResponse);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Full-Stack Server] Failed to start:', err);
  process.exit(1);
});
