import mongoose from 'mongoose';
import { User } from '../src/models';
import { connectDB } from '../src/config';

async function setGitHubUsername() {
  try {
    console.log('🔧 Setting GitHub username for test user...');
    
    await connectDB();
    
    // Find a student user to update
    const student = await User.findOne({ email: 'john.doe@sharda.com' });
    
    if (!student) {
      console.log('❌ Student user not found');
      await mongoose.connection.close();
      return;
    }
    
    // Set GitHub username and Firebase UID
    student.githubUsername = 'octocat'; // Using GitHub's test user
    student.firebaseUid = 'test-uid'; // Set a test Firebase UID
    await student.save();
    
    console.log(`✅ Updated user ${student.name} with:`);
    console.log(`   GitHub username: ${student.githubUsername}`);
    console.log(`   Firebase UID: ${student.firebaseUid}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Role: ${(student.roleId as any)?.name}`);
    
    await mongoose.connection.close();
    console.log('\n✅ GitHub username and Firebase UID set successfully');
    
  } catch (error) {
    console.error('❌ Error setting GitHub username:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

setGitHubUsername();