/**
 * Logger Utility
 * Provides consistent logging across the application
 */

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.log(`[INFO] [${this.context}] ${message}`, data ? data : '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] [${this.context}] ${message}`, data ? data : '');
  }

  error(message: string, data?: any): void {
    console.error(`[ERROR] [${this.context}] ${message}`, data ? data : '');
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] [${this.context}] ${message}`, data ? data : '');
    }
  }
}
