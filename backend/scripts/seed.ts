import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  Organization,
  Permission,
  Role,
  RolePermission,
  User,
} from '../src/models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

/**
 * Seed Script: Initialize database with roles, permissions, and demo data
 * Run: npm run seed
 */

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB connected');

    // Clear existing data (optional - comment out for reseed)
    // await Promise.all([
    //   Organization.deleteMany({}),
    //   Permission.deleteMany({}),
    //   Role.deleteMany({}),
    //   RolePermission.deleteMany({}),
    //   User.deleteMany({}),
    // ]);
    // console.log('✓ Cleared existing data');

    // 1. Create Permissions (Platform-wide, system-level)
    const permissions = [
      {
        name: 'ADD_MARKS',
        description: 'Add marks for students',
        category: 'MARKS',
      },
      {
        name: 'VIEW_MARKS',
        description: 'View student marks',
        category: 'MARKS',
      },
      {
        name: 'EDIT_MARKS',
        description: 'Edit student marks',
        category: 'MARKS',
      },
      {
        name: 'DELETE_MARKS',
        description: 'Delete student marks',
        category: 'MARKS',
      },
      {
        name: 'VIEW_ALL_MARKS',
        description: 'View all marks in organization',
        category: 'MARKS',
      },
      {
        name: 'VIEW_REPORTS',
        description: 'View academic reports',
        category: 'REPORTS',
      },
      {
        name: 'EDIT_PROFILE',
        description: 'Edit own profile',
        category: 'PROFILE',
      },
      {
        name: 'MANAGE_USERS',
        description: 'Manage organization users',
        category: 'ADMIN',
      },
      {
        name: 'MANAGE_ROLES',
        description: 'Manage organization roles',
        category: 'ADMIN',
      },
      {
        name: 'ACCESS_RESEARCH',
        description: 'Access research wing',
        category: 'RESEARCH',
      },
      {
        name: 'USE_CHATBOT',
        description: 'Use AI chatbot',
        category: 'CHATBOT',
      },
    ];

    const createdPermissions = await Permission.insertMany(permissions, {
      ordered: false,
    }).catch((error: any) => {
      // Ignore duplicate key errors
      if (error.code === 11000) {
        console.log('✓ Permissions already exist');
        return null;
      }
      throw error;
    });

    if (createdPermissions) {
      console.log(`✓ Created ${createdPermissions.length} permissions`);
    }

    // Fetch all permissions
    const allPermissions = await Permission.find().lean();

    // 2. Create Organization
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
      console.log('✓ Organization already exists');
    }

    // 3. Create Roles for Organization
    const roleConfigs = [
      {
        name: 'SUPER_ADMIN',
        description: 'Platform super administrator',
        isSuperAdmin: true,
        isSystem: true,
        permissions: allPermissions.map(p => p._id), // All permissions
      },
      {
        name: 'ADMIN',
        description: 'Organization administrator',
        isSuperAdmin: false,
        isSystem: true,
        permissions: allPermissions.map(p => p._id), // All permissions
      },
      {
        name: 'FACULTY',
        description: 'Faculty member',
        isSuperAdmin: false,
        isSystem: false,
        permissions: allPermissions
          .filter(p =>
            [
              'ADD_MARKS',
              'VIEW_MARKS',
              'EDIT_MARKS',
              'VIEW_REPORTS',
              'EDIT_PROFILE',
              'USE_CHATBOT',
            ].includes(p.name)
          )
          .map(p => p._id),
      },
      {
        name: 'STUDENT',
        description: 'Student',
        isSuperAdmin: false,
        isSystem: false,
        permissions: allPermissions
          .filter(p =>
            [
              'VIEW_MARKS',
              'VIEW_REPORTS',
              'EDIT_PROFILE',
              'ACCESS_RESEARCH',
              'USE_CHATBOT',
            ].includes(p.name)
          )
          .map(p => p._id),
      },
    ];

    for (const roleConfig of roleConfigs) {
      let role = await Role.findOne({
        name: roleConfig.name,
        organizationId: organization._id,
      });

      if (!role) {
        role = await Role.create({
          name: roleConfig.name,
          organizationId: organization._id,
          description: roleConfig.description,
          isSuperAdmin: roleConfig.isSuperAdmin,
          isSystem: roleConfig.isSystem,
        });
        console.log(`✓ Created role: ${roleConfig.name}`);

        // Assign permissions to role
        const rolePermissions = roleConfig.permissions.map(permissionId => ({
          roleId: role._id,
          permissionId,
        }));

        await RolePermission.insertMany(rolePermissions, {
          ordered: false,
        }).catch((error: any) => {
          if (error.code === 11000) {
            return null;
          }
          throw error;
        });

        console.log(`  ✓ Assigned ${roleConfig.permissions.length} permissions`);
      } else {
        console.log(`✓ Role already exists: ${roleConfig.name}`);
      }
    }

    // 4. Create Demo Users
    const superAdminRole = await Role.findOne({
      name: 'SUPER_ADMIN',
      organizationId: organization._id,
    });
    const adminRole = await Role.findOne({
      name: 'ADMIN',
      organizationId: organization._id,
    });
    const facultyRole = await Role.findOne({
      name: 'FACULTY',
      organizationId: organization._id,
    });
    const studentRole = await Role.findOne({
      name: 'STUDENT',
      organizationId: organization._id,
    });

    const demoUsers = [
      {
        name: 'Super Admin',
        email: 'superadmin@academicuniverse.com',
        password: 'SuperAdmin123',
        organizationId: organization._id,
        roleId: superAdminRole?._id,
      },
      {
        name: 'Admin User',
        email: 'admin@sharda.com',
        password: 'Admin123456',
        organizationId: organization._id,
        roleId: adminRole?._id,
      },
      {
        name: 'Dr. Jane Smith',
        email: 'jane.smith@sharda.com',
        password: 'Faculty123',
        organizationId: organization._id,
        roleId: facultyRole?._id,
      },
      {
        name: 'John Doe',
        email: 'john.doe@sharda.com',
        password: 'Student123',
        organizationId: organization._id,
        roleId: studentRole?._id,
      },
    ];

    for (const userData of demoUsers) {
      let user = await User.findOne({ email: userData.email });

      if (!user) {
        user = await User.create(userData);
        console.log(`✓ Created user: ${userData.name}`);
      } else {
        console.log(`✓ User already exists: ${userData.name}`);
      }
    }

    // Set super admin
    const superAdmin = await User.findOne({ email: 'superadmin@academicuniverse.com' });
    if (superAdmin && !organization.superAdminId) {
      organization.superAdminId = superAdmin._id;
      await organization.save();
      console.log('✓ Set super admin for organization');
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('Demo Users:');
    console.log('  - super@test.com (super admin)');
    console.log('  - admin@sharda.com (org admin)');
    console.log('  - jane.smith@sharda.com (faculty)');
    console.log('  - john.doe@sharda.com (student)');
    console.log('\nAll demo passwords: Super/Admin/Faculty/Student123\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
