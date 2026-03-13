"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const middleware_1 = require("./middleware");
const schedulerService_1 = __importDefault(require("./services/schedulerService"));
// Load environment variables FIRST, before any other imports that might depend on them
dotenv_1.default.config();
// Import routes after environment is loaded
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
/**
 * Middleware Setup
 */
// Body parser
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
// Session middleware
app.use((0, express_session_1.default)({
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
app.use('/api', routes_1.default);
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
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.errorHandler);
/**
 * Database & Server Initialization
 */
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        // Connect to MongoDB
        await (0, config_1.connectDB)();
        // Start Express server unless running tests (tests will use the app directly)
        if (process.env.NODE_ENV !== 'test') {
            app.listen(PORT, () => {
                console.log(`✓ Server running on port ${PORT}`);
                console.log(`✓ Environment: ${process.env.NODE_ENV}`);
                // Start the scheduler service after server is running
                schedulerService_1.default.start();
                console.log('✓ Scheduler service started');
            });
        }
    }
    catch (error) {
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
exports.default = app;
