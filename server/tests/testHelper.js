import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServerInstance = null;

export async function connectTestDB(dbSuffix = '') {
  const baseUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/codepulse_test';
  const localUri = dbSuffix ? `${baseUri}_${dbSuffix}` : baseUri;
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    return { mode: 'local', uri: localUri };
  } catch (err) {
    mongoServerInstance = await MongoMemoryServer.create();
    const memUri = mongoServerInstance.getUri();
    await mongoose.connect(memUri);
    return { mode: 'memory', uri: memUri };
  }
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
    } catch (e) {}
    await mongoose.disconnect();
  }
  if (mongoServerInstance) {
    await mongoServerInstance.stop();
  }
}
