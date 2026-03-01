import mongoose from 'mongoose';
import { User } from '../src/models';
import { connectDB } from '../src/config';

async function checkUsers() {
  try {
    console.log('🔍 Checking database users...');
    
    await connectDB();
    
    const users = await User.find({}).populate('roleId');
    console.log(`\n📊 Found ${users.length} users in database:`);
    
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  GitHub Username: ${user.githubUsername || 'NOT SET'}`);
      console.log(`  Role: ${(user.roleId as any)?.name || 'NO ROLE'}`);
      console.log(`  Firebase UID: ${user.firebaseUid}`);
    });
    
    if (users.length === 0) {
      console.log('\n⚠️  No users found in database');
      console.log('You need to create a user with a GitHub username to test the GitHub integration');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkUsers();