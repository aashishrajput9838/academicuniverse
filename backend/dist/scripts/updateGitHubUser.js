"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../src/models");
const config_1 = require("../src/config");
// Load environment variables FIRST
dotenv_1.default.config();
async function updateUserGitHubUsername() {
    try {
        console.log('🔧 Updating GitHub username for your user...\n');
        await (0, config_1.connectDB)();
        // Find your user by Firebase UID (based on the database output)
        // Your Firebase UID is: 3pxGBpiDrxWarUJrKqQYc1NhJok1 (from user "2023329421.aashish")
        const firebaseUID = "3pxGBpiDrxWarUJrKqQYc1NhJok1";
        const githubUsername = "aashishrajput9838";
        const user = await models_1.User.findOne({ firebaseUid: firebaseUID });
        if (!user) {
            console.log('❌ User not found with Firebase UID:', firebaseUID);
            console.log('🔍 Checking all users in database...\n');
            const allUsers = await models_1.User.find({});
            allUsers.forEach((u, index) => {
                console.log(`User ${index + 1}:`);
                console.log(`  ID: ${u._id}`);
                console.log(`  Name: ${u.name}`);
                console.log(`  Email: ${u.email}`);
                console.log(`  Firebase UID: ${u.firebaseUid || 'NOT SET'}`);
                console.log(`  GitHub Username: ${u.githubUsername || 'NOT SET'}`);
                console.log('');
            });
            await mongoose_1.default.connection.close();
            return;
        }
        console.log(`👤 Found user: ${user.name} (${user.email})`);
        console.log(`🔄 Updating GitHub username to: ${githubUsername}`);
        // Update the GitHub username
        user.githubUsername = githubUsername;
        await user.save();
        console.log(`✅ GitHub username updated successfully!`);
        console.log(`📋 Updated user info:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Firebase UID: ${user.firebaseUid}`);
        console.log(`   GitHub Username: ${user.githubUsername}`);
        await mongoose_1.default.connection.close();
        console.log('\n✅ Update completed successfully');
    }
    catch (error) {
        console.error('❌ Error updating GitHub username:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
updateUserGitHubUsername();
