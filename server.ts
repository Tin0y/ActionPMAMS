import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './backend';
import { initPostgresDatabase } from './backend/schemaSync';
import { executeRawSql, dbConfig, assertValidDatabaseConfig } from './backend/database';
import { organizationRepository } from './backend/repositories/OrganizationRepository';
import { userRepository } from './backend/repositories/UserRepository';
import { actionPlanRepository } from './backend/repositories/ActionPlanRepository';
import { activityRepository } from './backend/repositories/ActivityRepository';
import { fiscalYearRepository } from './backend/repositories/FiscalYearRepository';
import { templateRepository } from './backend/repositories/TemplateRepository';
import { optionRepository } from './backend/repositories/OptionRepository';
import { AuthenticatedRequest, requireAdmin } from './backend/services/AuthService';
import { rejectImpersonationAttempt } from './backend/services/AuthorizationService';
import {
  applySecurityHeaders,
  corsMiddleware,
  sanitizeErrorResponse
} from './backend/middleware/securityMiddleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  // Validate database configuration fail-fast at startup
  assertValidDatabaseConfig();

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.disable('x-powered-by');

  // Enterprise Security Headers & CORS
  app.use(applySecurityHeaders);
  app.use(corsMiddleware);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  app.use((req, _res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.originalUrl}`);
    }
    next();
  });

  // Initialize and synchronize PostgreSQL database (schema "apmams")
  try {
    await initPostgresDatabase();
    await Promise.all([
      organizationRepository.loadFromDatabase(),
      userRepository.loadFromDatabase(),
      actionPlanRepository.loadFromDatabase(),
      activityRepository.loadFromDatabase(),
      fiscalYearRepository.loadFromDatabase(),
      templateRepository.loadFromDatabase(),
      optionRepository.loadFromDatabase()
    ]);
    console.log(`[PostgreSQL] Connected and synchronized with database "${dbConfig.database}", schema "${dbConfig.schema}"`);
  } catch (err: any) {
    console.error('[PostgreSQL] Database synchronization warning:', err.message);
  }

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString()
    });
  });

  // Direct PostgreSQL database status and live stats for pgAdmin integration - Admin only
  app.get('/api/database/status', requireAdmin, async (req: AuthenticatedRequest, res) => {
    if (rejectImpersonationAttempt(req, res)) return;

    try {
      const statsJson = await executeRawSql(`
        SELECT json_build_object(
          'database', current_database(),
          'schema', current_schema(),
          'connectedUser', current_user,
          'organizations', (SELECT count(*) FROM apmams.organizations),
          'users', (SELECT count(*) FROM apmams.users),
          'activities', (SELECT count(*) FROM apmams.activities),
          'actionPlans', (SELECT count(*) FROM apmams.action_plans),
          'financials', (SELECT count(*) FROM apmams.activity_financials)
        );
      `);

      res.status(200).json({
        status: 'CONNECTED',
        database: dbConfig.database,
        schema: dbConfig.schema,
        host: dbConfig.host,
        port: dbConfig.port,
        stats: JSON.parse(statsJson || '{}'),
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'DISCONNECTED',
        database: dbConfig.database,
        error: err.message
      });
    }
  });

  // Mount Backend API Router (Spring Boot Pattern)
  app.use('/api', apiRouter);

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
      appType: 'spa',
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
