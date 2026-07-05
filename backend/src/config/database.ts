import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://localhost:27017/academic_universe';
const TEST_DB_NAME_PATTERN = /^(?:test|.+(?:_|-)(?:test))$/i;

const isTestRuntime = () => process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

const getDatabaseNameFromUri = (mongoUri: string): string | null => {
  try {
    const parsed = new URL(mongoUri);
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('?')[0]);
    return dbName || null;
  } catch {
    const match = mongoUri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
};

export const resolveMongoUri = () => {
  const configuredUri = process.env.MONGODB_URI;

  if (isTestRuntime()) {
    if (!configuredUri) {
      throw new Error('Jest test runtime requires MONGODB_URI to point to a dedicated test-only database. No MONGODB_URI was provided.');
    }

    const databaseName = getDatabaseNameFromUri(configuredUri);
    if (!databaseName || !TEST_DB_NAME_PATTERN.test(databaseName)) {
      throw new Error('Jest test runtime requires MONGODB_URI to point to an explicitly test-only database name such as academic_universe_test.');
    }

    return configuredUri;
  }

  return configuredUri || DEFAULT_LOCAL_URI;
};

export const connectDB = async () => {
  const MONGODB_URI = resolveMongoUri();

  try {
    const maskedUri = MONGODB_URI.replace(/\/\/.*:.*@/, '//****:****@');
    console.log(`Connecting to MongoDB at: ${maskedUri}`);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Faster timeout for dev
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error: any) {
    console.error('✗ MongoDB connection failed!');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);

    if (MONGODB_URI.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: You are running in PRODUCTION mode but MONGODB_URI is pointing to localhost.');
      console.error('Please set the MONGODB_URI environment variable in your Render/Vercel dashboard.');
    }

    if (isTestRuntime()) {
      throw error;
    }

    // In both development and production, we continue (though features will fail)
    console.warn('Continuing without MongoDB (features using MongoDB will fail)...');
    return;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected');
  } catch (error) {
    console.error('✗ MongoDB disconnect failed:', error);
  }
};
