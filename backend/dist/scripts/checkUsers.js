"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../src/models");
const config_1 = require("../src/config");
async function checkUsers() {
    try {
        console.log('🔍 Checking database users...');
        await (0, config_1.connectDB)();
        const users = await models_1.User.find({}).populate('roleId');
        console.log(`\n📊 Found ${users.length} users in database:`);
        users.forEach((user, index) => {
            console.log(`\nUser ${index + 1}:`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  GitHub Username: ${user.githubUsername || 'NOT SET'}`);
            console.log(`  Role: ${user.roleId?.name || 'NO ROLE'}`);
            console.log(`  Firebase UID: ${user.firebaseUid}`);
        });
        if (users.length === 0) {
            console.log('\n⚠️  No users found in database');
            console.log('You need to create a user with a GitHub username to test the GitHub integration');
        }
        await mongoose_1.default.connection.close();
        console.log('\n✅ Database check completed');
    }
    catch (error) {
        console.error('❌ Error checking users:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
checkUsers();
