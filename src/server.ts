import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { connectDb } from './db.js';
import { env } from './config.js';
import { authenticate } from './middleware/auth.js';
import { chatRouter } from './routes/chat.js';
import { documentsRouter } from './routes/documents.js';
import { incidentsRouter } from './routes/incidents.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use((pinoHttp as unknown as () => express.RequestHandler)());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', authenticate);
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/incidents', incidentsRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.name === 'ZodError' ? 400 : 500;
  reqLog(err);
  res.status(status).json({
    error: status === 400 ? 'Invalid request' : 'Internal server error'
  });
});
function reqLog(err: unknown) { console.error(err); }

await connectDb();
app.listen(env.PORT, () => console.log(`Cyber API listening on :${env.PORT}`));
