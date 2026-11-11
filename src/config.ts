import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4.1-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('cyber-api'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  VECTOR_INDEX_NAME: z.string().default('security_chunks_vector'),
  RAG_TOP_K: z.coerce.number().int().min(1).max(30).default(8),
  MAX_UPLOAD_CHARS: z.coerce.number().default(200000),
  MCP_PORT: z.coerce.number().default(4100)
});
export const env = schema.parse(process.env);
