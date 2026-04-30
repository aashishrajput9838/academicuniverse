import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction } from 'express';

export const initSentry = (app: Express) => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('SENTRY_DSN not provided, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  console.log('✓ Sentry initialized');
};

export const sentryRequestHandler = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const sentryTracingHandler = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const sentryErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(error);
};

export default Sentry;
