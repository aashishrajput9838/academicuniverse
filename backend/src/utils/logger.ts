import { forwardErrorToAI } from '../services/logForwarder';

export class Logger {
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] [${this.prefix}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] [${this.prefix}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] [${this.prefix}] ${message}`, ...args);

    let stack = '';
    const errObj = args.find(a => a instanceof Error);
    if (errObj) {
      stack = errObj.stack || '';
    } else if (args.length > 0 && typeof args[0] === 'string') {
      stack = args.join(' ');
    }

    // Capture system-level crashes that bypass Express
    // We default route to the prefix name so we know where it crashed
    forwardErrorToAI(`[Class: ${this.prefix}]`, 'SYSTEM', 500, message, stack);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] [${this.prefix}] ${message}`, ...args);
  }
}