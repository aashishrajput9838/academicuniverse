// Test script to verify backend connectivity
async function testBackend() {
  try {
    console.log('Testing backend connectivity...');
    
    const response = await fetch('http://localhost:5000/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is running:', data);
      return true;
    } else {
      console.log('❌ Backend returned error status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not accessible:', error.message);
    return false;
  }
}

// Run the test
testBackend().then(success => {
  if (!success) {
    console.log('\n⚠️  Please make sure your backend server is running:');
    console.log('   cd backend');
    console.log('   npm run dev');
  }
});