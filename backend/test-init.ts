
console.log('1. Loading dotenv...');
import dotenv from 'dotenv';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envPath, override: true });
console.log('2. Dotenv loaded!');

console.log('3. Importing express...');
import express from 'express';
console.log('4. Express loaded!');

console.log('5. Importing connectDB...');
import { connectDB } from './src/config';
console.log('6. connectDB imported!');

console.log('7. Importing firebaseAdmin...');
import './src/config/firebaseAdmin';
console.log('8. firebaseAdmin imported!');

console.log('9. Importing initSentry...');
import { initSentry } from './src/config/sentry';
console.log('10. initSentry imported!');

console.log('11. All imports done!');
