import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models';
import { connectDB } from '../src/config';
import { getProjectStats } from '../src/controllers/githubController';

// Load environment variables
dotenv.config();

async function testAPIEndpoint() {
  try {
    console.log('🚀 Testing GitHub API Endpoint...\n');
    
    await connectDB();
    
    // Find the test user
    const user = await User.findOne({ email: 'john.doe@sharda.com' }).populate('roleId');
    
    if (!user) {
      console.log('❌ Test user not found');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`👤 Testing with user: ${user.name} (${user.email})`);
    console.log(`GitHub Username: ${user.githubUsername}`);
    console.log(`Role: ${(user.roleId as any)?.name}\n`);
    
    // Create a mock request object
    const mockReq: any = {
      firebaseUser: {
        firebaseUid: 'test-uid',
        email: user.email
      }
    };
    
    // Create a mock response object
    let mockResData: any = null;
    const mockRes: any = {
      status: (code: number) => {
        return {
          json: (data: any) => {
            mockResData = { status: code, data };
          }
        };
      }
    };
    
    // Call the controller function
    await getProjectStats(mockReq, mockRes);
    
    if (mockResData) {
      console.log('✅ API Response:');
      console.log(JSON.stringify(mockResData, null, 2));
    } else {
      console.log('❌ No response data received');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ API test completed');
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testAPIEndpoint();