import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { connectDB } from './config';
import { errorHandler, notFoundHandler } from './middleware';
import schedulerService from './services/schedulerService';

// Load environment variables FIRST, before any other imports that might depend on them
dotenv.config();

// Import routes after environment is loaded
import routes from './routes';

const app = express();

/**
 * Middleware Setup
 */

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
    secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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

        // Start the scheduler service after server is running
        schedulerService.start();
        console.log('✓ Scheduler service started');
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
