import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import stampRoutes from './routes/stampRoutes.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Routes
  app.use('/api/stamp', stampRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint Not Found' });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ServerError]', err);
    res.status(500).json({
      error: '伺服器內部錯誤',
      message: err.message || '發生未知錯誤'
    });
  });

  return app;
}
