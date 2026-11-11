import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { answerQuestion } from '../services/llm.js';
import { AuditLog } from '../models.js';

export const chatRouter = Router();
chatRouter.post('/', async (req, res, next) => {
  try {
    const { question } = z.object({ question: z.string().min(3).max(5000) }).parse(req.body);
    const requestId = String(req.headers['x-request-id'] || crypto.randomUUID());
    const result = await answerQuestion({
      tenantId: req.user!.tenantId, userId: req.user!.sub, question, requestId
    });
    await AuditLog.create({
      tenantId: req.user!.tenantId, actorId: req.user!.sub,
      action: 'chat.question', resource: 'llm',
      requestId, outcome: 'success'
    });
    res.json({ requestId, ...result });
  } catch (e) { next(e); }
});
