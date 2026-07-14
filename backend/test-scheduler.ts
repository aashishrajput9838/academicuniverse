
console.log('=== TEST SCHEDULER ===');
import dotenv from 'dotenv';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envPath, override: true });
console.log('Loaded env, importing schedulerService...');
import schedulerService from './src/services/schedulerService';
console.log('schedulerService imported! Now calling start...');
schedulerService.start();
console.log('schedulerService.start() called! Done!');
