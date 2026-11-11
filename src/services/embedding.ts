import OpenAI from 'openai';
import { env } from '../config.js';
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function embed(text: string): Promise<number[]> {
  const result = await openai.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text.replace(/\s+/g, ' ').slice(0, 8000),
    encoding_format: 'float'
  });
  return result.data[0].embedding;
}
