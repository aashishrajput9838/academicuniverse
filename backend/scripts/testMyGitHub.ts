import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Test script to verify GitHub API integration with your username directly
 */
async function testMyGitHubIntegration() {
  console.log('🚀 Testing GitHub API Integration with your username...\n');
  
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('❌ GITHUB_TOKEN is not set in environment variables');
      return;
    }
    
    // Test with your GitHub username
    const testUsername = 'aashishrajput9838';
    console.log(`🔍 Testing with GitHub user: ${testUsername}`);
    
    // Make direct API call to GitHub
    const response = await axios.get(`https://api.github.com/users/${testUsername}/repos`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Academic-Universe-App'
      },
      params: {
        sort: 'updated',
        per_page: 100
      }
    });
    
    const repositories = response.data;
    console.log(`\n✅ Successfully fetched ${repositories.length} repositories`);
    
    // Count repositories with specific topics
    const completedCount = repositories.filter((repo: any) => 
      repo.topics && repo.topics.includes('completed')
    ).length;
    
    const ongoingCount = repositories.filter((repo: any) => 
      repo.topics && repo.topics.includes('ongoing')
    ).length;
    
    console.log('📊 Project Statistics:');
    console.log(`   Total Projects: ${repositories.length}`);
    console.log(`   Completed: ${completedCount}`);
    console.log(`   Ongoing: ${ongoingCount}`);
    console.log(`   GitHub Username: ${testUsername}`);
    
    console.log('\n✅ GitHub API Test Successful!');
    
  } catch (error: any) {
    console.error('\n❌ GitHub API Test Failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. If successful, the GitHub integration should work in the app');
  console.log('2. If failed, check GitHub username spelling and token permissions');
}

testMyGitHubIntegration();