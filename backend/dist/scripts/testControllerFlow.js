"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("../src/models");
const config_1 = require("../src/config");
const githubService_1 = __importDefault(require("../src/services/githubService"));
// Load environment variables
dotenv_1.default.config();
async function testControllerFlow() {
    try {
        console.log('🔍 Testing GitHub controller flow...\n');
        await (0, config_1.connectDB)();
        // Simulate the exact flow from the controller
        // Find user by Firebase UID (yours is 3pxGBpiDrxWarUJrKqQYc1NhJok1)
        const firebaseUID = "3pxGBpiDrxWarUJrKqQYc1NhJok1";
        console.log(`🔍 Finding user by Firebase UID: ${firebaseUID}`);
        const user = await models_1.User.findOne({ firebaseUid: firebaseUID }).populate('roleId');
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
        const userRole = user.roleId;
        if (userRole.name !== 'STUDENT') {
            console.log(`❌ User does not have STUDENT role, has: ${userRole.name}`);
            return;
        }
        console.log(`✅ User has STUDENT role`);
        // Now test the GitHub service call
        console.log(`\n🔍 Testing GitHub service call with username: ${user.githubUsername}`);
        // Check rate limit
        if (githubService_1.default.isRateLimited()) {
            console.log('⚠️ GitHub service is rate limited');
            return;
        }
        console.log('✅ GitHub service is not rate limited');
        // Fetch project statistics from GitHub
        console.log('🔍 Calling githubService.getProjectStats()...');
        const stats = await githubService_1.default.getProjectStats(user.githubUsername);
        console.log('\n✅ GitHub controller flow test successful!');
        console.log('📊 Returned stats:');
        console.log(`   Total Projects: ${stats.total}`);
        console.log(`   Completed: ${stats.completed}`);
        console.log(`   Ongoing: ${stats.ongoing}`);
        console.log(`   GitHub Username: ${user.githubUsername}`);
    }
    catch (error) {
        console.error('\n❌ Error in controller flow test:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
    }
    finally {
        await require('mongoose').connection.close();
    }
}
testControllerFlow();
