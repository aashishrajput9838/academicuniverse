import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { connectDB } from './config';
import { errorHandler, notFoundHandler, requestIdMiddleware, performanceMonitorMiddleware } from './middleware';
import schedulerService from './services/schedulerService';
import logger from './utils/logger';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';

// Load environment variables FIRST, before any other imports that might depend on them
dotenv.config();

// Import routes after environment is loaded
import routes from './routes';

const app = express();

// Initialize Sentry
initSentry(app);

/**
 * Middleware Setup
 */

// Request ID tracking (first middleware)
app.use(requestIdMiddleware);

// Sentry request handler (placeholder)
if (process.env.SENTRY_DSN) {
  app.use(sentryRequestHandler);
  app.use(sentryTracingHandler);
}

// Performance monitoring
app.use(performanceMonitorMiddleware);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://academicuniverse.vercel.app',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      logger.warn('CORS request blocked', { origin });
      callback(error);
    }
  },
  credentials: true,
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

/**
 * Routes
 */
app.use('/api', routes);

/**
 * Health check
 */
app.get('/health', (req, res) => {
  logger.info('Health check requested', { requestId: req.requestId });
  res.json({
    status: 'ok',
    message: 'Academic Universe Backend is running',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

/**
 * Sentry error handler (placeholder)
 */
if (process.env.SENTRY_DSN) {
  app.use(sentryErrorHandler);
}

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
    logger.info('Connected to MongoDB');

    // Start Express server unless running tests (tests will use the app directly)
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`, {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
        });

        // Start the scheduler service after server is running
        schedulerService.start();
        logger.info('Scheduler service started');
      });
    }
  } catch (error) {
    logger.error('Server startup failed', { error });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

startServer();

export default app;
