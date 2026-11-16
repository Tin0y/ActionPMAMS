import { createApiApp } from './app';

export const config = {
  api: {
    bodyParser: false
  }
};

const app = createApiApp({ enableServerlessHydration: true });

export default function handler(req: any, res: any) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = req.url.startsWith('/') ? `/api${req.url}` : `/api/${req.url}`;
  }
  return app(req, res);
}
