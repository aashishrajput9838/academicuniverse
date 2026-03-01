import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import githubService from '../src/services/githubService';

/**
 * Test script to verify GitHub API integration
 * Run with: npm run test:github
 */

async function testGitHubIntegration() {
  console.log('🚀 Testing GitHub API Integration...\n');
  
  try {
    // Test with a public GitHub username
    const testUsername = 'octocat'; // GitHub's test user
    console.log(`🔍 Testing with GitHub user: ${testUsername}`);
    
    const stats = await githubService.getProjectStats(testUsername);
    
    console.log('\n✅ GitHub API Test Successful!');
    console.log('📊 Project Statistics:');
    console.log(`   Total Projects: ${stats.total}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Ongoing: ${stats.ongoing}`);
    console.log(`   GitHub Username: ${testUsername}`);
    
  } catch (error: any) {
    console.error('\n❌ GitHub API Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.statusCode === 500) {
      console.error('   🔧 Solution: Please check your GITHUB_TOKEN in .env file');
    } else if (error.statusCode === 502) {
      console.error('  🔧: GitHub API might be temporarily unavailable');
    } else if (error.statusCode === 404) {
      console.error('  🔧 Solution: GitHub user not found or repository access restricted');
    }
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Generate your GitHub Personal Access Token');
  console.log('2. Update backend/.env with your GITHUB_TOKEN');
  console.log('3. Add "completed" and "ongoing" topics to your GitHub repositories');
  console.log('4. Test with your actual GitHub username in the student dashboard');
}

// Run the test
testGitHubIntegration();