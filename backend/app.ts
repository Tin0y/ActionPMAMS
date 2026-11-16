import express, { Express } from 'express';
import { apiRouter } from './index';
import { initPostgresDatabase } from './schemaSync';
import { executeRawSql, dbConfig, assertValidDatabaseConfig } from './database';
import { organizationRepository } from './repositories/OrganizationRepository';
import { userRepository } from './repositories/UserRepository';
import { actionPlanRepository } from './repositories/ActionPlanRepository';
import { activityRepository } from './repositories/ActivityRepository';
import { fiscalYearRepository } from './repositories/FiscalYearRepository';
import { templateRepository } from './repositories/TemplateRepository';
import { optionRepository } from './repositories/OptionRepository';
import { AuthenticatedRequest, requireAdmin } from './services/AuthService';
import { rejectImpersonationAttempt } from './services/AuthorizationService';
import {
  applySecurityHeaders,
  corsMiddleware,
  sanitizeErrorResponse
} from './middleware/securityMiddleware';

let hasLoadedOnce = false;
let hasInitializedSchema = false;
let lastLoadedAtMs = 0;
let inflightLoad: Promise<void> | null = null;
const SERVERLESS_REFRESH_TTL_MS = 3000;

export async function loadAllRepositoriesFromDatabase(): Promise<void> {
  await Promise.all([
    organizationRepository.loadFromDatabase(),
    userRepository.loadFromDatabase(),
    actionPlanRepository.loadFromDatabase(),
    activityRepository.loadFromDatabase(),
    fiscalYearRepository.loadFromDatabase(),
    templateRepository.loadFromDatabase(),
    optionRepository.loadFromDatabase()
  ]);
  hasLoadedOnce = true;
  lastLoadedAtMs = Date.now();
}

export async function ensureBackendReady(options?: { runSchemaSync?: boolean }): Promise<void> {
  assertValidDatabaseConfig();

  if (options?.runSchemaSync && !hasInitializedSchema) {
    await initPostgresDatabase();
    hasInitializedSchema = true;
  }

  const isServerless = Boolean(process.env.VERCEL);
  const now = Date.now();
  const needsRefresh =
    !hasLoadedOnce || (isServerless && now - lastLoadedAtMs > SERVERLESS_REFRESH_TTL_MS);

  if (!needsRefresh) return;

  if (!inflightLoad) {
    inflightLoad = loadAllRepositoriesFromDatabase()
      .catch((err) => {
        console.error('[PostgreSQL] Repository hydration error:', err?.message || err);
        throw err;
      })
      .finally(() => {
        inflightLoad = null;
      });
  }

  await inflightLoad;
}

export function createApiApp(options?: { enableServerlessHydration?: boolean }): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Request logger
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      const start = Date.now();
      res.on('finish', () => {
        console.log(`[API ${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
      });
    }
    next();
  });

  // Enterprise Security Headers & CORS
  app.use(applySecurityHeaders);
  app.use(corsMiddleware);

  // Parse JSON / URL-encoded payloads (skip raw binary upload routes cleanly)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Liveness health check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
      timestamp: new Date().toISOString()
    });
  });

  // Ensure PostgreSQL repositories are hydrated from Supabase before serving API routes
  if (options?.enableServerlessHydration) {
    app.use('/api', async (_req, res, next) => {
      try {
        await ensureBackendReady({ runSchemaSync: false });
        next();
      } catch (err: any) {
        return res.status(503).json({
          timestamp: new Date().toISOString(),
          status: 503,
          success: false,
          code: 'DATABASE_UNAVAILABLE',
          message: err?.message || 'Unable to connect to PostgreSQL database.'
        });
      }
    });
  }

  // Direct PostgreSQL database status and live stats - Admin only
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

  // Mount Backend API Router
  app.use('/api', apiRouter);

  // Global sanitized production error handler
  app.use(sanitizeErrorResponse);

  return app;
}
