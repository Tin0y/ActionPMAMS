import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './backend';
import { initPostgresDatabase } from './backend/schemaSync';
import { executeRawSql, dbConfig } from './backend/database';
import { organizationRepository } from './backend/repositories/OrganizationRepository';
import { userRepository } from './backend/repositories/UserRepository';
import { actionPlanRepository } from './backend/repositories/ActionPlanRepository';
import { activityRepository } from './backend/repositories/ActivityRepository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize and synchronize PostgreSQL database (schema "apmams")
  try {
    await initPostgresDatabase();
    await Promise.all([
      organizationRepository.loadFromDatabase(),
      userRepository.loadFromDatabase(),
      actionPlanRepository.loadFromDatabase(),
      activityRepository.loadFromDatabase()
    ]);
    console.log(`[PostgreSQL] Connected and synchronized with database "${dbConfig.database}", schema "${dbConfig.schema}"`);
  } catch (err: any) {
    console.error('[PostgreSQL] Database synchronization warning:', err.message);
  }

  // Health and System architecture information
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      database: 'PostgreSQL 18 (Localhost / pgAdmin 4)',
      schema: dbConfig.schema,
      architecture: 'Spring Boot Layered Pattern (Controller -> Service -> Repository -> PostgreSQL Database)',
      timestamp: new Date().toISOString()
    });
  });

  // Direct PostgreSQL database status and live stats for pgAdmin integration
  app.get('/api/database/status', async (_req, res) => {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Full-Stack Server] Failed to start:', err);
  process.exit(1);
});
