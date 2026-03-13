"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../src/models");
const config_1 = require("../src/config");
const githubController_1 = require("../src/controllers/githubController");
// Load environment variables
dotenv_1.default.config();
async function testAPIEndpoint() {
    try {
        console.log('🚀 Testing GitHub API Endpoint...\n');
        await (0, config_1.connectDB)();
        // Find the test user
        const user = await models_1.User.findOne({ email: 'john.doe@sharda.com' }).populate('roleId');
        if (!user) {
            console.log('❌ Test user not found');
            await mongoose_1.default.connection.close();
            return;
        }
        console.log(`👤 Testing with user: ${user.name} (${user.email})`);
        console.log(`GitHub Username: ${user.githubUsername}`);
        console.log(`Role: ${user.roleId?.name}\n`);
        // Create a mock request object
        const mockReq = {
            firebaseUser: {
                firebaseUid: 'test-uid',
                email: user.email
            }
        };
        // Create a mock response object
        let mockResData = null;
        const mockRes = {
            status: (code) => {
                return {
                    json: (data) => {
                        mockResData = { status: code, data };
                    }
                };
            }
        };
        // Call the controller function
        await (0, githubController_1.getProjectStats)(mockReq, mockRes);
        if (mockResData) {
            console.log('✅ API Response:');
            console.log(JSON.stringify(mockResData, null, 2));
        }
        else {
            console.log('❌ No response data received');
        }
        await mongoose_1.default.connection.close();
        console.log('\n✅ API test completed');
    }
    catch (error) {
        console.error('❌ Error testing API endpoint:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
testAPIEndpoint();
