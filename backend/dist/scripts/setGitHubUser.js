"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../src/models");
const config_1 = require("../src/config");
async function setGitHubUsername() {
    try {
        console.log('🔧 Setting GitHub username for test user...');
        await (0, config_1.connectDB)();
        // Find a student user to update
        const student = await models_1.User.findOne({ email: 'john.doe@sharda.com' });
        if (!student) {
            console.log('❌ Student user not found');
            await mongoose_1.default.connection.close();
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
        console.log(`   Role: ${student.roleId?.name}`);
        await mongoose_1.default.connection.close();
        console.log('\n✅ GitHub username and Firebase UID set successfully');
    }
    catch (error) {
        console.error('❌ Error setting GitHub username:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
setGitHubUsername();
