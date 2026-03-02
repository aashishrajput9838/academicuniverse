import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';
import Role from '../src/models/Role';
import Organization from '../src/models/Organization';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function createAdminUser() {
  try {
    console.log('🚀 Creating ADMIN user...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB connected');

    // Find or create organization
    let organization = await Organization.findOne({ slug: 'sharda-university' });
    if (!organization) {
      organization = await Organization.create({
        name: 'Sharda University',
        slug: 'sharda-university',
        planType: 'ENTERPRISE',
        maxUsers: 10000,
        isActive: true,
      });
      console.log('✓ Created organization: Sharda University');
    } else {
      console.log('✓ Using existing organization: Sharda University');
    }

    // Find the ADMIN role (it should exist from seeding)
    let adminRole = await Role.findOne({
      name: 'ADMIN',
      organizationId: organization._id,
    });

    if (!adminRole) {
      // If it doesn't exist, create it with all permissions
      adminRole = await Role.create({
        name: 'ADMIN',
        organizationId: organization._id,
        description: 'Organization Administrator with full access',
        isSystem: true,
      });
      console.log('✓ Created ADMIN role');
    } else {
      console.log('✓ Using existing ADMIN role');
    }

    // Create ADMIN user
    const adminEmail = 'admin@academicuniverse.com';
    const adminPassword = 'Admin123!';

    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      adminUser = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminPassword,
        organizationId: organization._id,
        roleId: adminRole._id,
        isActive: true,
      });
      console.log('✓ Created ADMIN user:');
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Password: ${adminPassword}`);
      console.log(`  Role: ADMIN`);
    } else {
      console.log('✓ ADMIN user already exists:');
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Role: ADMIN`);
      
      // Update password if needed
      if (adminUser.password) {
        adminUser.password = adminPassword;
        await adminUser.save();
        console.log(`  Password updated to: ${adminPassword}`);
      }
    }

    console.log('\n✅ ADMIN user setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n📝 Notes:');
    console.log('   - This user has ADMIN role with full system access');
    console.log('   - Can upload timetables for any section');
    console.log('   - Will see "Upload" buttons on all sections in Overlap Engine');
    console.log('   - Use these credentials to test the Upload Timetable feature');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating ADMIN user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
createAdminUser();