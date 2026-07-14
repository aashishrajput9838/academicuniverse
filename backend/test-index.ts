import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports that might depend on them
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envPath, override: true });

// Now import all other modules after env is loaded
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { connectDB } from './config';
import { errorHandler, notFoundHandler, requestIdMiddleware, performanceMonitorMiddleware } from './middleware';
import schedulerService from './services/schedulerService';
import logger from './utils/logger';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
import routes from './routes';

const app = express();

// Trust proxy for Render/Vercel (must be set before other middleware)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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
  'https://academicuniverse.onrender.com',
  'https://academic-universe.onrender.com',
];

if (process.env.CORS_ORIGIN) {
  const origins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
  allowedOrigins.push(...origins);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or some browser extensions)
    if (!origin || origin === 'null' || origin === '') {
      return callback(null, true);
    }
    
    // Check if the origin is in the allowed list or is a subdomain of an allowed domain
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      if (allowed === origin) return true;
      // Handle wildcard subdomains for vercel.app
      if (allowed.includes('vercel.app') && origin.endsWith('.vercel.app')) return true;
      // Handle same domain but different protocol/port if needed (usually covered by exact match)
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
        logger.warn('CORS request blocked', { 
          origin, 
          allowedOrigins
        });
        // Instead of throwing an error, we just return false to the callback
        // This results in a standard CORS rejection without breaking the middleware chain
        callback(null, false);
      }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-ID'],
  optionsSuccessStatus: 200,
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

console.log('[DEBUG] About to start server...');
const startServer = async () => {
    try {
        console.log('[DEBUG] Connecting to MongoDB...');
        // Connect to MongoDB
        await connectDB();
        console.log('[DEBUG] MongoDB connected');
        logger.info('Connected to MongoDB');

        // Start Express server unless running tests (tests will use the app directly)
        if (process.env.NODE_ENV !== 'test') {
            console.log('[DEBUG] Starting server on port', PORT);
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
        console.error('[DEBUG] Server startup failed', { error });
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
