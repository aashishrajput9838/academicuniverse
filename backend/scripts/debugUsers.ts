import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models';
import { connectDB } from '../src/config';

// Load environment variables FIRST
dotenv.config();

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in database...\n');
    
    await connectDB();
    
    const users = await User.find({}).populate('roleId');
    console.log(`📊 Found ${users.length} users in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Firebase UID: ${user.firebaseUid || 'NOT SET'}`);
      console.log(`  GitHub Username: ${user.githubUsername || 'NOT SET'}`);
      console.log(`  Role: ${(user.roleId as any)?.name || 'NO ROLE'}`);
      console.log('');
    });
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database');
    }
    
    await mongoose.connection.close();
    console.log('✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkUsers();