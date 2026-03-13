"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
console.log('Environment variables test:');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET');
console.log('GITHUB_TOKEN value:', process.env.GITHUB_TOKEN);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
