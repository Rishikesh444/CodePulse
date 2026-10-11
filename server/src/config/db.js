import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codepulse_lite';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[DB] Connected to MongoDB via URI: ${uri}`);
    return { mode: 'external', uri };
  } catch (err) {
    console.warn(`[DB] Could not connect to MongoDB URI (${err.message}). Falling back to MongoMemoryServer.`);
  }

  // Fallback to MongoMemoryServer if no URI or external connection failed
  try {
    mongoMemoryInstance = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[DB] Connected to in-memory MongoDB server: ${memoryUri}`);
    return { mode: 'memory', uri: memoryUri };
  } catch (memErr) {
    console.error(`[DB] Failed to start in-memory MongoDB server:`, memErr);
    throw memErr;
  }
};

export const getDBStatus = () => {
  const state = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    state: states[state] || 'unknown',
    isInMemory: !!mongoMemoryInstance,
    dbName: mongoose.connection.name || 'codepulse_lite',
  };
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryInstance) {
    await mongoMemoryInstance.stop();
  }
};
