"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';
const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✓ MongoDB connected successfully');
    }
    catch (error) {
        console.error('✗ MongoDB connection failed:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        console.log('✓ MongoDB disconnected');
    }
    catch (error) {
        console.error('✗ MongoDB disconnect failed:', error);
    }
};
exports.disconnectDB = disconnectDB;
