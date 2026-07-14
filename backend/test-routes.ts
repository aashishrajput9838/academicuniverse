
console.log('=== TEST ROUTES ===');
import dotenv from 'dotenv';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envPath, override: true });
console.log('Loaded env, importing routes...');
import routes from './src/routes';
console.log('Routes imported! Done!');
