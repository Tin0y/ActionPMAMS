import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health and System architecture information
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      architecture: 'Spring Boot Layered Pattern (Controller -> Service -> Repository)',
      timestamp: new Date().toISOString(),
      routing: {
        collegeOrgs: 'Stage 1 (Org Pres) -> Stage 2 (Faculty Adviser) -> Stage 3 (College Dean) -> Stage 4 (OSD Approval) -> Offline OVCSAS/OC',
        nonCollegeOrgs: 'Stage 1 (Org Pres) -> Stage 2 (Faculty Adviser) -> Stage 3 (OSD Approval) -> Offline OVCSAS/OC (Dean bypassed)',
        chancellorAccount: 'Removed (Clearance confirmed by Student Org leadership)'
      }
    });
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
