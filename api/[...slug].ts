import { createApiApp } from '../backend/app';

export const config = {
  api: {
    bodyParser: false
  }
};

const app = createApiApp({ enableServerlessHydration: true });

export default function handler(req: any, res: any) {
  return app(req, res);
}
