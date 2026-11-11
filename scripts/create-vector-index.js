// Run once against MongoDB Atlas. Adjust dimensions if you change embedding model.
import 'dotenv/config';
import mongoose from 'mongoose';
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
await db.collection('securitychunks').createSearchIndex({
  name: process.env.VECTOR_INDEX_NAME || 'security_chunks_vector',
  type: 'vectorSearch',
  definition: {
    fields: [
      { type: 'vector', path: 'embedding', numDimensions: 1536, similarity: 'cosine' },
      { type: 'filter', path: 'tenantId' }
    ]
  }
});
console.log('Vector Search index creation requested');
await mongoose.disconnect();
