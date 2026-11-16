import { createApiApp } from './app';

export const config = {
  api: {
    bodyParser: false
  }
};

const app = createApiApp({ enableServerlessHydration: true });

export default function handler(req: any, res: any) {
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const rewrittenSubPath = parsed.searchParams.get('__path');
      if (rewrittenSubPath !== null) {
        parsed.searchParams.delete('__path');
        const cleanSub = rewrittenSubPath.replace(/^\/+/, '');
        const qs = parsed.searchParams.toString();
        req.url = cleanSub ? `/api/${cleanSub}${qs ? `?${qs}` : ''}` : `/api${qs ? `?${qs}` : ''}`;
      } else if (!parsed.pathname.startsWith('/api')) {
        const cleanPath = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
        const qs = parsed.searchParams.toString();
        req.url = `/api${cleanPath}${qs ? `?${qs}` : ''}`;
      }
    } catch {
      if (!req.url.startsWith('/api')) {
        req.url = req.url.startsWith('/') ? `/api${req.url}` : `/api/${req.url}`;
      }
    }
  }
  return app(req, res);
}
