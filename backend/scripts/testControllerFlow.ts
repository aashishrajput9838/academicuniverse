import dotenv from 'dotenv';
import { User } from '../src/models';
import { connectDB } from '../src/config';
import githubService from '../src/services/githubService';

// Load environment variables
dotenv.config();

async function testControllerFlow() {
  try {
    console.log('🔍 Testing GitHub controller flow...\n');
    
    await connectDB();
    
    // Simulate the exact flow from the controller
    // Find user by Firebase UID (yours is 3pxGBpiDrxWarUJrKqQYc1NhJok1)
    const firebaseUID = "3pxGBpiDrxWarUJrKqQYc1NhJok1";
    
    console.log(`🔍 Finding user by Firebase UID: ${firebaseUID}`);
    
    const user = await User.findOne({ firebaseUid: firebaseUID }).populate('roleId');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.name}`);
    console.log(`👤 GitHub Username: ${user.githubUsername || 'NOT SET'}`);
    
    if (!user.githubUsername) {
      console.log('❌ GitHub username not set');
      return;
    }
    
    // Check if user has student role
    const userRole = user.roleId as any;
    if (userRole.name !== 'STUDENT') {
      console.log(`❌ User does not have STUDENT role, has: ${userRole.name}`);
      return;
    }
    
    console.log(`✅ User has STUDENT role`);
    
    // Now test the GitHub service call
    console.log(`\n🔍 Testing GitHub service call with username: ${user.githubUsername}`);
    
    // Check rate limit
    if (githubService.isRateLimited()) {
      console.log('⚠️ GitHub service is rate limited');
      return;
    }
    
    console.log('✅ GitHub service is not rate limited');
    
    // Fetch project statistics from GitHub
    console.log('🔍 Calling githubService.getProjectStats()...');
    const stats = await githubService.getProjectStats(user.githubUsername);
    
    console.log('\n✅ GitHub controller flow test successful!');
    console.log('📊 Returned stats:');
    console.log(`   Total Projects: ${stats.total}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Ongoing: ${stats.ongoing}`);
    console.log(`   GitHub Username: ${user.githubUsername}`);
    
  } catch (error: any) {
    console.error('\n❌ Error in controller flow test:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  } finally {
    await require('mongoose').connection.close();
  }
}

testControllerFlow();