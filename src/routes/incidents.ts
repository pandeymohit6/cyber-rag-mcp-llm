import { Router } from 'express';
import { z } from 'zod';
import { Incident } from '../models.js';
import { requireRole } from '../middleware/auth.js';

export const incidentsRouter = Router();
incidentsRouter.get('/', async (req, res, next) => {
  try {
    const q = z.object({
      severity: z.enum(['critical','high','medium','low']).optional(),
      status: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      before: z.string().datetime().optional()
    }).parse(req.query);
    const filter: Record<string, any> = { tenantId: req.user!.tenantId };
    if (q.severity) filter.severity = q.severity;
    if (q.status) filter.status = q.status;
    if (q.before) filter.occurredAt = { $lt: new Date(q.before) };
    const incidents = await Incident.find(filter)
      .sort({ occurredAt: -1, _id: -1 }).limit(q.limit).lean();
    res.json({ incidents, nextBefore: incidents.at(-1)?.occurredAt ?? null });
  } catch (e) { next(e); }
});
incidentsRouter.post('/ingest', requireRole('admin','ingestion-service'), async (req, res, next) => {
  try {
    const rows = z.array(z.object({
      incidentId: z.string(), severity: z.enum(['critical','high','medium','low']),
      status: z.string().default('open'), title: z.string(),
      description: z.string().optional(), hostId: z.string().optional(),
      source: z.string().optional(), occurredAt: z.coerce.date(),
      raw: z.record(z.string(), z.unknown()).optional()
    })).max(1000).parse(req.body);
    const ops = rows.map(row => ({
      updateOne: {
        filter: { tenantId: req.user!.tenantId, incidentId: row.incidentId },
        update: { $set: { ...row, tenantId: req.user!.tenantId } },
        upsert: true
      }
    }));
    if (ops.length) await Incident.bulkWrite(ops, { ordered: false });
    res.status(202).json({ accepted: rows.length });
  } catch (e) { next(e); }
});
