import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

export const connectDB = async () => {
  try {
    const maskedUri = MONGODB_URI.replace(/\/\/.*:.*@/, '//****:****@');
    console.log(`Connecting to MongoDB at: ${maskedUri}`);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Increased timeout for slow production cold starts
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
    
    // In production, we don't want to crash immediately on a transient connection error
    // but Render will restart the service anyway if it fails the health check.
    if (process.env.NODE_ENV === 'production') {
        console.warn('Continuing anyway to allow health check to respond (though features will fail)...');
        return; 
    }
    process.exit(1);
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
