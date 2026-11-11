import { Types } from 'mongoose';
import { SecurityChunk } from '../models.js';
import { env } from '../config.js';
import { embed } from './embedding.js';

export function splitIntoChunks(input: string, size = 1100, overlap = 160): string[] {
  const text = input.replace(/\r/g, '').trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end);
      if (boundary > start + size * 0.6) end = boundary;
    }
    const part = text.slice(start, end).trim();
    if (part) chunks.push(part);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export async function indexDocument(input: {
  tenantId: string; documentId: Types.ObjectId; filename: string; text: string;
}) {
  const chunks = splitIntoChunks(input.text);
  const docs = [];
  for (let i = 0; i < chunks.length; i++) {
    const vector = await embed(chunks[i]);
    docs.push({
      tenantId: input.tenantId, documentId: input.documentId,
      source: input.filename, content: chunks[i], chunkNo: i,
      embedding: vector, metadata: { kind: 'security_document' }
    });
  }
  if (docs.length) await SecurityChunk.insertMany(docs, { ordered: true });
  return docs.length;
}

export async function retrieve(tenantId: string, query: string) {
  const vector = await embed(query);
  return SecurityChunk.aggregate([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: vector,
        numCandidates: Math.max(env.RAG_TOP_K * 20, 100),
        limit: env.RAG_TOP_K,
        filter: { tenantId }
      }
    },
    {
      $project: {
        _id: 1, source: 1, content: 1, chunkNo: 1, metadata: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ]);
}
