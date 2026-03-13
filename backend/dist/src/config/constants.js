"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONGODB_URI = exports.JWT_EXPIRY = exports.JWT_SECRET = exports.NODE_ENV = exports.PORT = void 0;
exports.PORT = process.env.PORT || 5000;
exports.NODE_ENV = process.env.NODE_ENV || 'development';
exports.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
exports.JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
exports.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';
