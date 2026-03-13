import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, Role, Organization } from '../src/models';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function createAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ MongoDB connected');

        const organization = await Organization.findOne({ slug: 'sharda-university' });
        if (!organization) {
            console.error('Organization not found!');
            return;
        }

        const adminRole = await Role.findOne({ name: 'ADMIN', organizationId: organization._id });
        if (!adminRole) {
            console.error('ADMIN role not found!');
            return;
        }

        const email = 'admin@academicuniverse.com';
        const password = 'Admin123!';

        let user = await User.findOne({ email });

        if (user) {
            console.log('✓ User admin@academicuniverse.com already exists. Updating password and role...');
            user.password = password;
            user.roleId = adminRole._id;
            await user.save();
            console.log('✓ Updated admin user');
        } else {
            user = await User.create({
                name: 'System Admin',
                email,
                password: password,
                organizationId: organization._id,
                roleId: adminRole._id,
            });
            console.log('✓ Created admin user');
        }
    } catch (error) {
        console.error('✗ Failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createAdmin();
