import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

export const connectDB = async () => {
  try {
    const maskedUri = MONGODB_URI.replace(/\/\/.*:.*@/, '//****:****@');
    console.log(`Connecting to MongoDB at: ${maskedUri}`);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error: any) {
    console.error('✗ MongoDB connection failed!');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
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
