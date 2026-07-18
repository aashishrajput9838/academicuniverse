/**
 * Migration script: recompute semesterNumber for existing AcademicRecords
 *
 * Usage:
 *   npx ts-node scripts/migrate-semester-numbers.ts
 *
 * This script:
 * 1. Finds all AcademicRecords without semesterNumber
 * 2. Looks up the corresponding Person's admissionYear
 * 3. Computes semesterNumber using SemesterResolutionService
 * 4. Updates the AcademicRecord with the computed semesterNumber
 *
 * If admissionYear is missing, semesterNumber remains null.
 */

import mongoose from 'mongoose';
import { AcademicRecord } from '../src/models/AcademicRecord';
import { Person } from '../src/models/Person';
import { SemesterResolutionService } from '../src/shared/services/semesterResolution.service';
import { toObjectId } from '../src/utils/mongooseHelpers';

interface AcademicRecordDoc extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  personId: mongoose.Types.ObjectId;
  semester: string;
  year: number;
  term?: string;
  academicYear?: number;
  semesterNumber?: number;
}

async function migrate() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const records = await AcademicRecord.find({ semesterNumber: { $exists: false } }).lean();
    console.log(`Found ${records.length} AcademicRecords without semesterNumber`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const record of records) {
      const academicYear = (record as any).academicYear ?? (record as any).year;
      const term = (record as any).term ?? (record as any).semester ?? 'Term 1';
      
      let admissionYear: number | undefined;
      try {
        const person = await Person.findOne({ _id: (record as any).personId, organizationId: (record as any).organizationId }).lean();
        admissionYear = person?.admissionYear;
      } catch {
        admissionYear = undefined;
      }
      
      const resolution = SemesterResolutionService.resolve({ admissionYear, academicYear, term });
      const semesterNumber = resolution.isResolvable ? resolution.semesterNumber : null;
      
      if (semesterNumber !== null) {
        await AcademicRecord.updateOne(
          { _id: (record as any)._id },
          { $set: { semesterNumber } }
        );
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`Migration complete:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (no admissionYear or invalid data): ${skipped}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate();
