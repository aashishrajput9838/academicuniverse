import * as path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { connectDB } from './src/config/database';
import { UploadService } from './src/services/upload-service';
import { ReviewService } from './src/shared/services/review.service';
import { UaipUpload } from './src/models/UaipUpload';
import { KnowledgeRecordModel } from './src/models/KnowledgeRecord';
import { ReviewHistory } from './src/models/ReviewHistory';
import { AcademicSchedule } from './src/models/AcademicSchedule';

async function main() {
  console.log('=== Starting UAIP Ingestion Duplicate Protection Validation ===');

  await connectDB();
  console.log('Connected to MongoDB database.');

  const uploadService = new UploadService();
  const reviewService = new ReviewService();

  // Test setup: mock org context and document content
  const mockOrgId = '6a41791cf3894eafe5e634e2';
  const mockUserId = '6a4179d1c7f546ca0ba0c874';
  const testFileName = 'duplicate_test_schedule.xls';
  const testMimeType = 'application/vnd.ms-excel';
  const mockFileBuffer = Buffer.from('Duplicate protection test mock file content with some bytes ' + Date.now());
  const fileSize = mockFileBuffer.length;

  console.log(`\nMock Upload params: name=${testFileName}, size=${fileSize} bytes`);

  // Cleanup any previous test run with the same hash
  const crypto = await import('crypto');
  const expectedHash = crypto.createHash('sha256').update(mockFileBuffer).digest('hex');
  await UaipUpload.deleteMany({ organizationId: mockOrgId, fileHash: expectedHash });
  console.log(`Cleaned up previous uploads matching hash: ${expectedHash}`);

  // Fetch initial counts
  const initialUploadsCount = await UaipUpload.countDocuments({ organizationId: mockOrgId, fileHash: expectedHash });
  console.log(`Initial DB count of uploads matching this hash: ${initialUploadsCount} (Expected: 0)`);

  console.log('\n--- Step 1: Uploading the exact same file 5 times in a row ---');
  const ids: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const processingId = await uploadService.uploadFile({
      buffer: mockFileBuffer,
      originalName: testFileName,
      mimeType: testMimeType,
      size: fileSize,
      userId: mockUserId,
      organizationId: mockOrgId,
    });
    ids.push(processingId);
    console.log(`Upload Attempt ${i}: Returned processingId = ${processingId}`);
  }

  // Assertion: All returned processing IDs must be identical
  const uniqueIds = Array.from(new Set(ids));
  console.log(`\nUnique processingIds returned across 5 attempts: ${uniqueIds.length}`);
  if (uniqueIds.length !== 1) {
    console.error('FAIL: Upload was not deduplicated! Multiple processingIds were generated.');
    process.exit(1);
  }
  console.log('SUCCESS: All 5 attempts returned the exact same processingId!');

  // Check database count
  const finalUploadsCount = await UaipUpload.countDocuments({ organizationId: mockOrgId, fileHash: expectedHash });
  console.log(`Final DB count of uploads matching this hash: ${finalUploadsCount} (Expected: 1)`);
  if (finalUploadsCount !== 1) {
    console.error(`FAIL: Database created ${finalUploadsCount} records instead of 1.`);
    process.exit(1);
  }
  console.log('SUCCESS: Exactly 1 record exists in the UaipUpload collection!');

  const processingId = uniqueIds[0];

  // Set up a mock KnowledgeRecord to verify approval idempotence
  await KnowledgeRecordModel.deleteMany({ processingId });
  await KnowledgeRecordModel.create({
    processingId,
    documentCategory: 'ACADEMIC_TIMETABLE',
    language: 'en',
    isScanned: false,
    parserStrategy: 'EXCEL_PARSER',
    confidenceScore: 0.95,
    reviewStatus: 'PENDING_REVIEW',
    candidateFields: {
      schedule: [
        {
          date: 'Mon, July 20, 2026',
          events: [
            {
              timeSlot: '09:00:00 - 09:50:00',
              courseCode: 'CS101',
              courseName: 'Intro to Computer Science',
              room: 'Room 101',
              instructor: 'Dr. John Doe',
            },
          ],
        },
      ],
    },
  });
  console.log('\n--- Step 2: Created a KnowledgeRecord in PENDING_REVIEW status ---');

  // Verify database record before approval
  const krBefore = await KnowledgeRecordModel.findOne({ processingId }).lean() as any;
  console.log(`KnowledgeRecord reviewStatus before approval: ${krBefore.reviewStatus}`);

  const reviewerContext = {
    userId: mockUserId,
    role: 'FACULTY',
    organizationId: mockOrgId,
  };

  // Clean up any previous AcademicSchedule records for this person
  const mockPersonId = new (mongoose.Types.ObjectId as any)(mockUserId);
  await (AcademicSchedule as any).deleteMany({ organizationId: mockOrgId, personId: mockPersonId });

  console.log('\n--- Step 3: Triggering First Approval ---');
  const firstApproveResult = await reviewService.approve({
    processingId,
    editedFields: {},
    reviewer: reviewerContext,
  });
  console.log('First Approval Result:', firstApproveResult);

  // Check state in DB
  const krAfterFirst = await KnowledgeRecordModel.findOne({ processingId }).lean() as any;
  console.log(`KnowledgeRecord reviewStatus after first approval: ${krAfterFirst.reviewStatus}`);
  if (krAfterFirst.reviewStatus !== 'APPROVED') {
    console.error('FAIL: Expected reviewStatus to be APPROVED.');
    process.exit(1);
  }

  // Count AcademicSchedule records
  const scheduleCountAfterFirst = await AcademicSchedule.countDocuments({ organizationId: mockOrgId });
  console.log(`AcademicSchedule count after first approval: ${scheduleCountAfterFirst} (Expected: 1)`);

  console.log('\n--- Step 4: Triggering Second Approval (Idempotency Check) ---');
  try {
    await reviewService.approve({
      processingId,
      editedFields: {},
      reviewer: reviewerContext,
    });
    console.error('FAIL: Second approval succeeded! It should have thrown a conflict error.');
    process.exit(1);
  } catch (err: any) {
    console.log(`SUCCESS: Second approval was blocked as expected. Error message: "${err.message}"`);
    if (err.message !== 'Document is already approved') {
      console.error(`FAIL: Unexpected error message: "${err.message}"`);
      process.exit(1);
    }
  }

  // Verify counts remained unique
  const scheduleCountAfterSecond = await AcademicSchedule.countDocuments({ organizationId: mockOrgId });
  console.log(`AcademicSchedule count after second attempt: ${scheduleCountAfterSecond} (Expected: 1)`);
  if (scheduleCountAfterSecond !== 1) {
    console.error('FAIL: Duplicate records were created in the canonical collection.');
    process.exit(1);
  }
  console.log('SUCCESS: Canonical collection is unique and contains exactly 1 record!');

  // Cleanup test artifacts
  await UaipUpload.deleteMany({ organizationId: mockOrgId, fileHash: expectedHash });
  await KnowledgeRecordModel.deleteMany({ processingId });
  await ReviewHistory.deleteMany({ processingId });
  await (AcademicSchedule as any).deleteMany({ organizationId: mockOrgId, personId: mockPersonId });
  console.log('\n--- Step 5: Cleaned up test data ---');

  console.log('\n======================================================');
  console.log('ALL DEDUPLICATION AND IDEMPOTENCY CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Unexpected error running validation:', err);
  process.exit(1);
});
