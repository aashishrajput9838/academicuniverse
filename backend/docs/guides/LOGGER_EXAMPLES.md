# Logger Usage Examples

This document shows how to use the new Winston logger in your code.

## Basic Usage

```typescript
import logger from './utils/logger';

// Simple info log
logger.info('Server started successfully');

// Log with metadata
logger.info('User logged in', {
  userId: '12345',
  email: 'user@example.com',
});

// Different log levels
logger.error('Database connection failed', { error: err });
logger.warn('Rate limit approaching', { current: 90, limit: 100 });
logger.debug('Debug information', { data: someData });
```

## In Controllers with Request ID

```typescript
import logger from '../utils/logger';
import { Request, Response } from 'express';

export const someController = async (req: Request, res: Response) => {
  // Always include requestId in logs
  const logMeta = { requestId: req.requestId, userId: req.user?._id };
  
  logger.info('Processing request', logMeta);
  
  try {
    // Your logic here
    logger.info('Request completed successfully', logMeta);
    res.json({ success: true });
  } catch (error) {
    logger.error('Request failed', { ...logMeta, error });
    res.status(500).json({ error: 'Failed' });
  }
};
```

## Creating Child Loggers

```typescript
import { createChildLogger } from './utils/logger';

// Create a child logger for a specific service
const userServiceLogger = createChildLogger('user-service');

userServiceLogger.info('Creating new user', { email: 'user@example.com' });
```

## Log Levels

- `error` - Errors that need immediate attention
- `warn` - Warning messages
- `info` - General information
- `http` - HTTP request logs (automatically handled by middleware)
- `debug` - Debug information (only in development)

## Log Files

Logs are automatically written to:
- `logs/error.log` - Error level logs only
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections
