
import dotenv from 'dotenv';
console.log('Current NODE_ENV:', process.env.NODE_ENV);
const envPath = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
console.log('Using env path:', envPath);
const result = dotenv.config({ path: envPath, override: true });
console.log('Dotenv config result:', result);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);
