import mongoose from 'mongoose';
import { env } from './config.js';
export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 30,
    minPoolSize: 3,
    serverSelectionTimeoutMS: 10000
  });
}
