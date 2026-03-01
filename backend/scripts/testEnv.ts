import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment variables test:');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET');
console.log('GITHUB_TOKEN value:', process.env.GITHUB_TOKEN);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');