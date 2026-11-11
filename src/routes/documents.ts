import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { SecurityDocument, SecurityChunk } from '../models.js';
import { indexDocument } from '../services/rag.js';
import { env } from '../config.js';
import { requireRole } from '../middleware/auth.js';

export const documentsRouter = Router();

// Text ingestion endpoint. Put PDF/DOCX extraction in an isolated worker before production.
documentsRouter.post('/', requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const body = z.object({
      filename: z.string().min(1).max(255),
      text: z.string().min(20).max(env.MAX_UPLOAD_CHARS)
    }).parse(req.body);
    const sha256 = crypto.createHash('sha256').update(body.text).digest('hex');
    const existing = await SecurityDocument.findOne({
      tenantId: req.user!.tenantId, sha256
    });
    if (existing?.status === 'indexed') {
      return res.status(200).json({ documentId: existing.id, status: 'already_indexed' });
    }
    const doc = existing ?? await SecurityDocument.create({
      tenantId: req.user!.tenantId, filename: body.filename, sha256, status: 'processing'
    });
    await SecurityChunk.deleteMany({ tenantId: req.user!.tenantId, documentId: doc._id });
    const chunkCount = await indexDocument({
      tenantId: req.user!.tenantId, documentId: doc._id,
      filename: body.filename, text: body.text
    });
    doc.status = 'indexed';
    doc.chunkCount = chunkCount;
    await doc.save();
    res.status(201).json({ documentId: doc.id, status: doc.status, chunkCount });
  } catch (e) { next(e); }
});

documentsRouter.get('/', async (req, res, next) => {
  try {
    const docs = await SecurityDocument.find({ tenantId: req.user!.tenantId })
      .select('filename status chunkCount createdAt').sort({ createdAt: -1 }).limit(100);
    res.json({ documents: docs });
  } catch (e) { next(e); }
});
