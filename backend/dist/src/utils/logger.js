"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor(prefix) {
        this.prefix = prefix;
    }
    info(message, ...args) {
        console.log(`[INFO] [${this.prefix}] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[WARN] [${this.prefix}] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[ERROR] [${this.prefix}] ${message}`, ...args);
    }
    debug(message, ...args) {
        console.debug(`[DEBUG] [${this.prefix}] ${message}`, ...args);
    }
}
exports.Logger = Logger;
