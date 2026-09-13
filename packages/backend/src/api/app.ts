import express, { Express } from 'express';
import cors from 'cors';
import { Container } from '../container';
import { problemsRouter } from './routes/problems';
import { attemptsRouter } from './routes/attempts';
import { errorHandler } from './errorHandler';

export function createApp(container: Container): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', llmConfigured: container.llmConfigured });
  });

  app.use('/api/problems', problemsRouter(container));
  app.use('/api/attempts', attemptsRouter(container));

  app.use(errorHandler);

  return app;
}
