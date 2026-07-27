import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  Organization,
  Permission,
  Role,
  RolePermission,
  User,
  ModuleVisibility,
} from '../src/models';
import { resolveMongoUri } from '../src/config/database';

dotenv.config();

const MONGODB_URI = resolveMongoUri();

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
      {
        name: 'MANAGE_MODULES',
        description: 'Manage module visibility and feature flags',
        category: 'ADMIN',
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
        role = (await Role.create({
          name: roleConfig.name,
          organizationId: organization._id,
          description: roleConfig.description,
          isSuperAdmin: roleConfig.isSuperAdmin,
          isSystem: roleConfig.isSystem,
        }))!;
        console.log(`✓ Created role: ${roleConfig.name}`);
      } else {
        console.log(`✓ Role already exists: ${roleConfig.name}`);
      }

      // Always ensure permissions are assigned (whether role is new or existing)
      const rolePermissions = roleConfig.permissions.map(permissionId => ({
        roleId: role!._id,
        permissionId,
      }));

      await RolePermission.insertMany(rolePermissions, {
        ordered: false,
      }).catch((error: any) => {
        if (error.code === 11000) {
          // Duplicate key error - permissions already exist
          return null;
        }
        throw error;
      });

      console.log(`  ✓ Assigned ${roleConfig.permissions.length} permissions`);
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
        roleId: superAdminRole!._id,
      },
      {
        name: 'Admin User',
        email: 'admin@sharda.com',
        password: 'Admin123456',
        organizationId: organization._id,
        roleId: adminRole!._id,
      },
      {
        name: 'Dr. Vamsi',
        email: '2023329421.vamsi@fa.sharda.ac.in',
        password: '123456',
        organizationId: organization._id,
        roleId: facultyRole!._id,
      },
      {
        name: 'John Doe',
        email: 'john.doe@sharda.com',
        password: 'Student123',
        organizationId: organization._id,
        roleId: studentRole!._id,
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

    // Ensure initial Super Admin user exists
    const initialSuperAdminEmail = '2023329421.aashish@ug.sharda.ac.in';
    let initialSuperAdmin = await User.findOne({ email: initialSuperAdminEmail });
    if (!initialSuperAdmin) {
      initialSuperAdmin = await User.create({
        name: 'Aashish Rajput',
        email: initialSuperAdminEmail,
        password: 'SuperAdmin123',
        organizationId: organization._id,
        roleId: superAdminRole!._id,
      });
      console.log(`✓ Created initial Super Admin: ${initialSuperAdminEmail}`);
    } else {
      // Ensure they have SUPER_ADMIN role
      if (initialSuperAdmin.roleId?.toString() !== superAdminRole!._id.toString()) {
        initialSuperAdmin.roleId = superAdminRole!._id;
        await initialSuperAdmin.save();
        console.log(`✓ Updated role to SUPER_ADMIN for: ${initialSuperAdminEmail}`);
      }
      console.log(`✓ Initial Super Admin already exists: ${initialSuperAdminEmail}`);
    }

    // 5. Register Module Visibility entries
    const moduleVisibilityEntries = [
      { key: 'dashboard', name: 'Dashboard', category: 'core', isEnabled: true, isVisible: true, sortOrder: 0 },
      { key: 'profile', name: 'Profile', category: 'personal', isEnabled: true, isVisible: true, sortOrder: 1 },
      { key: 'events', name: 'Events from Gmail', category: 'communication', isEnabled: true, isVisible: true, sortOrder: 2 },
      { key: 'mail', name: 'Mail Explorer', category: 'communication', isEnabled: true, isVisible: true, sortOrder: 3 },
      { key: 'growth-hub', name: 'Growth Hub', category: 'academic', isEnabled: true, isVisible: true, sortOrder: 4 },
      { key: 'document-intelligence', name: 'Document Intelligence', category: 'productivity', isEnabled: true, isVisible: true, sortOrder: 5 },
      { key: 'academic-schedule', name: 'Academic Schedule', category: 'academic', isEnabled: true, isVisible: true, sortOrder: 6 },
      { key: 'career-profile', name: 'Career Profile', category: 'career', isEnabled: true, isVisible: true, sortOrder: 7 },
      { key: 'ai-chatbot', name: 'AI Chatbot', category: 'ai', isEnabled: true, isVisible: true, sortOrder: 8 },
      { key: 'research-wing', name: 'Research Wing', category: 'research', isEnabled: true, isVisible: true, sortOrder: 9 },
      { key: 'code-arena', name: 'Code Arena', category: 'development', isEnabled: true, isVisible: true, sortOrder: 10 },
      { key: 'academic-records', name: 'Academic Records', category: 'academic', isEnabled: true, isVisible: true, sortOrder: 11 },
      { key: 'sync-college-profile', name: 'Sync College Profile', category: 'integration', isEnabled: true, isVisible: true, sortOrder: 12 },
      { key: 'webscrap', name: 'Webscrap', category: 'productivity', isEnabled: true, isVisible: true, sortOrder: 13 },
      { key: 'skills-tracker', name: 'Skills Tracker', category: 'career', isEnabled: true, isVisible: true, sortOrder: 14 },
      { key: 'resume-builder', name: 'Resume Builder', category: 'career', isEnabled: true, isVisible: true, sortOrder: 15 },
      { key: 'overlap-engine', name: 'Overlap Engine', category: 'academic', isEnabled: true, isVisible: true, sortOrder: 16 },
      { key: 'find-faculty-cabin', name: 'Find Faculty Cabin', category: 'navigation', isEnabled: true, isVisible: true, sortOrder: 17 },
      { key: 'soft-skills-lab', name: 'Soft Skills Lab', category: 'career', isEnabled: true, isVisible: true, sortOrder: 18 },
      { key: 'career-verified-profile', name: 'Career & Verified Profile', category: 'career', isEnabled: true, isVisible: true, sortOrder: 19 },
    ];

    for (const entry of moduleVisibilityEntries) {
      await ModuleVisibility.findOneAndUpdate(
        { key: entry.key },
        entry,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`✓ Registered ${moduleVisibilityEntries.length} module visibility entries`);

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
