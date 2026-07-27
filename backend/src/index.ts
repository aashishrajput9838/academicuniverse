// Catch ALL errors before anything else!
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥');
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

console.log('=== INDEX.TS STARTED ===');
import fs from 'fs';
import dotenv from 'dotenv';

// Determine environment mode before loading env files
const effectiveNodeEnv = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = effectiveNodeEnv;
const envPath = effectiveNodeEnv === 'production' ? '.env' : '.env.development';

if (effectiveNodeEnv !== 'production' && !fs.existsSync(envPath)) {
  console.warn(`[CONFIG_AUDIT] Expected env file '${envPath}' not found. Falling back to '.env' if available.`);
}

console.log("[CONFIG_AUDIT] Effective NODE_ENV:", process.env.NODE_ENV);
console.log("[CONFIG_AUDIT] Loading environment from:", envPath);
dotenv.config({ path: envPath, override: true });

if (process.env.NODE_ENV === 'production' && !process.env.OPENROUTER_API_KEY) {
  console.error('Required environment variable OPENROUTER_API_KEY is missing in production');
  process.exit(1);
}

// Now import all other modules after env is loaded
console.log("[CONFIG_AUDIT] All env vars containing 'client' or 'google':");
Object.keys(process.env).forEach(key => {
    if (key.toLowerCase().includes('client') || key.toLowerCase().includes('google')) {
        console.log(`  ${key}:`, process.env[key] ? (key.toLowerCase().includes('secret') ? '***REDACTED***' : JSON.stringify(process.env[key])) : 'undefined');
    }
});
console.log("[CONFIG_AUDIT] NODE_ENV:", process.env.NODE_ENV);
console.log("[CONFIG_AUDIT] GOOGLE_REDIRECT_URI:", JSON.stringify(process.env.GOOGLE_REDIRECT_URI));
console.log("[CONFIG_AUDIT] GOOGLE_CLIENT_ID (last 8 chars):", process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.slice(-8) : 'undefined');
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { connectDB } from './config';
import { errorHandler, notFoundHandler, requestIdMiddleware, performanceMonitorMiddleware } from './middleware';
import schedulerService from './services/schedulerService';
import { KnowledgeJobRepository } from './shared/repositories/knowledgeJob.repository';
import { KnowledgeDispatcher } from './shared/services/knowledgeDispatcher.service';
import { KnowledgeQueueService } from './shared/services/knowledgeQueue.service';
import logger from './utils/logger';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
import routes from './routes';

// Event-driven subsystem initialization (explicit bootstrap)
import { skillsEventListener } from './shared/events/skillsEventListener';
import { growthHubSkillsIntegration } from './modules/growth/growthHubSkillsIntegration';
import { resumeClassificationEventListener } from './services/resume/resumeClassificationEventListener';
import { moduleVisibilityService } from './services/moduleVisibility.service';

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

const startServer = async () => {
    try {
        await connectDB();
        logger.info('Connected to MongoDB');

        // Initialize module visibility cache
        await moduleVisibilityService.initialize();
        logger.info('Module visibility cache initialized');

        // Initialize event-driven subsystems after DB connection
        skillsEventListener.start();
        growthHubSkillsIntegration.start();
        resumeClassificationEventListener.start();
        logger.info('Event-driven subsystems initialized');

        if (process.env.NODE_ENV !== 'test') {
            const server = app.listen(PORT, () => {
                logger.info(`Server running on port ${PORT}`, {
                    port: PORT,
                    environment: process.env.NODE_ENV || 'development',
                });

                // Start the scheduler service after server is running
                schedulerService.start();
                logger.info('Scheduler service started');

                // Initialize Knowledge Queue Service (singleton) only once
                if (!(global as any).knowledgeQueueService) {
                  const knowledgeJobRepo = new KnowledgeJobRepository();
                  const knowledgeDispatcher = new KnowledgeDispatcher();
                  const knowledgeQueueService = new KnowledgeQueueService(knowledgeJobRepo, knowledgeDispatcher);
                  knowledgeQueueService.start();
                  (global as any).knowledgeQueueService = knowledgeQueueService;
                }
                // else: already running

            });

            server.on('error', (err: any) => {
                logger.error(`Server error on port ${PORT}`, { error: err });
            });

            server.on('listening', () => {
                const address = server.address();
                logger.info('Server listening', { address });
            });
        }
    } catch (error) {
        logger.error('Server startup failed', { error });
        process.exit(1);
    }
};

// Handle graceful shutdown
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  growthHubSkillsIntegration.stop();
  skillsEventListener.stop();
  logger.info('Event-driven subsystems stopped');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
