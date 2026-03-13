import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Organization } from '../src/models';
import Section from '../src/models/Section';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function seedSections() {
    try {
        console.log('🌱 Starting MongoDB Sections seeding...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ MongoDB connected');

        const organization = await Organization.findOne({ slug: 'sharda-university' });

        if (!organization) {
            console.log('Organization not found. Run "npm run seed" first.');
            process.exit(1);
        }

        const sectionsData = [
            { name: 'Section A', courseId: 'B.Tech CSE', organizationId: organization._id, capacity: 60 },
            { name: 'Section B', courseId: 'B.Tech CSE', organizationId: organization._id, capacity: 60 },
            { name: 'Section C', courseId: 'B.Tech CSE', organizationId: organization._id, capacity: 60 },
            { name: 'Section D', courseId: 'B.Tech ECE', organizationId: organization._id, capacity: 60 }
        ];

        for (const data of sectionsData) {
            const existing = await Section.findOne({ name: data.name, organizationId: data.organizationId });
            if (!existing) {
                await Section.create(data);
                console.log(`✓ Created section: ${data.name}`);
            } else {
                console.log(`✓ Section ${data.name} already exists`);
            }
        }

        console.log('\n✅ Sections seeding completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('✗ Seeding failed:', error);
        process.exit(1);
    }
}

seedSections();
