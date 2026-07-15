import * as winston from 'winston';
import { randomUUID } from 'crypto';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
);

const developmentFormat = winston.format.combine(
  format,
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: any) => `${info.timestamp} [${info.level}] ${info.service || 'app'}: ${info.message} ${Object.keys(info.metadata || {}).length > 0 ? JSON.stringify(info.metadata, null, 2) : ''}`,
  ),
);

const productionFormat = winston.format.combine(
  format,
  winston.format.json(),
);

const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: productionFormat,
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: productionFormat,
  }),
];

const baseLogger = winston.createLogger({
  level: level(),
  levels,
  defaultMeta: {
    service: 'academic-universe-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export class Logger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = baseLogger.child({ service });
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  http(message: string, meta?: any) {
    this.logger.http(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}

export const createChildLogger = (service: string, metadata: Record<string, any> = {}) => {
  return baseLogger.child({
    service,
    requestId: randomUUID(),
    ...metadata,
  });
};

const defaultLogger = new Logger('app');
export const logger = defaultLogger;
export default defaultLogger;
