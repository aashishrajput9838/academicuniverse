import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';

// Load environment variables
dotenv.config();

const app = express();

/**
 * Middleware Setup
 */

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request logging (basic)
app.use((req, express, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * Routes
 */
app.use('/api', routes);

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Academic Universe Backend is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error Handling Middleware (must be last)
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Database & Server Initialization
 */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

        // Start Express server unless running tests (tests will use the app directly)
        if (process.env.NODE_ENV !== 'test') {
          app.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV}`);
          });
        }
  } catch (error) {
    console.error('✗ Server startup failed:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
