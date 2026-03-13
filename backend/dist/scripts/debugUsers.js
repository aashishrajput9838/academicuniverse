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
async function checkUsers() {
    try {
        console.log('🔍 Checking all users in database...\n');
        await (0, config_1.connectDB)();
        const users = await models_1.User.find({}).populate('roleId');
        console.log(`📊 Found ${users.length} users in database:\n`);
        users.forEach((user, index) => {
            console.log(`User ${index + 1}:`);
            console.log(`  ID: ${user._id}`);
            console.log(`  Name: ${user.name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Firebase UID: ${user.firebaseUid || 'NOT SET'}`);
            console.log(`  GitHub Username: ${user.githubUsername || 'NOT SET'}`);
            console.log(`  Role: ${user.roleId?.name || 'NO ROLE'}`);
            console.log('');
        });
        if (users.length === 0) {
            console.log('⚠️  No users found in database');
        }
        await mongoose_1.default.connection.close();
        console.log('✅ Database check completed');
    }
    catch (error) {
        console.error('❌ Error checking users:', error);
        await mongoose_1.default.connection.close();
        process.exit(1);
    }
}
checkUsers();
