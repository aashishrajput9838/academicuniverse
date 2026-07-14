
console.log('=== TEST CONNECTDB ===');
import dotenv from 'dotenv';
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: envPath, override: true });
console.log('Loaded env, importing connectDB...');
import { connectDB } from './src/config/database';
console.log('connectDB imported! Now calling...');
connectDB().then(() => {
  console.log('connectDB done!');
  process.exit(0);
}).catch((e) => {
  console.error('connectDB error', e);
  process.exit(1);
});
