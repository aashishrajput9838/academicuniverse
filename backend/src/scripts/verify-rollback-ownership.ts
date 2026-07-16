/**
 * Verification script for Student-Owned Rollback & Delete Workflow.
 *
 * Run with: npx ts-node -r tsconfig-paths/register backend/src/scripts/verify-rollback-ownership.ts
 *
 * This script verifies:
 * 1. Admin can rollback any approved document
 * 2. Document owner can rollback their own approved document
 * 3. Non-owner cannot rollback another student's document (403)
 * 4. canRollback endpoint returns correct eligibility
 */

import mongoose from 'mongoose';
import { UaipUpload } from '../models/UaipUpload';
import { KnowledgeRecordModel } from '../models/KnowledgeRecord';
import { ReviewHistory } from '../models/ReviewHistory';
import { ReviewService } from '../shared/services/review.service';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

async function connect() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
    console.log('[verify] Connected to MongoDB');
  }
}

async function disconnect() {
  await mongoose.disconnect();
  console.log('[verify] Disconnected from MongoDB');
}

async function run() {
  await connect();

  const reviewService = new ReviewService();

  // Use a test processingId - in real verification this would be a real uploaded document
  const testProcessingId = 'verify-rollback-' + Date.now();
  const testOrgId = 'org-test-123';
  const ownerUserId = 'user-owner-123';
  const otherUserId = 'user-other-456';

  // Create a mock upload and knowledge record for testing
  console.log('\n[verify] Creating test document...');
  await UaipUpload.create({
    processingId: testProcessingId,
    organizationId: testOrgId,
    userId: ownerUserId,
    fileName: 'test-transcript.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    status: 'SUCCESS',
  });

  await KnowledgeRecordModel.create({
    processingId: testProcessingId,
    documentCategory: 'TRANSCRIPT',
    language: 'en',
    isScanned: false,
    parserStrategy: 'PDF_PARSER',
    confidenceScore: 0.95,
    reviewStatus: 'APPROVED',
    version: 1,
    candidateFields: { subjects: [] },
  });

  // Create a mock approval history entry
  await ReviewHistory.create({
    processingId: testProcessingId,
    organizationId: testOrgId,
    reviewerId: 'admin-1',
    reviewerRole: 'ADMIN',
    action: 'APPROVED',
    version: 1,
    timestamp: new Date(),
  });

  console.log('[verify] Test document created');

  // Test 1: Admin can rollback
  console.log('\n[test 1] Admin rollback...');
  try {
    await reviewService.rollback({
      processingId: testProcessingId,
      reviewer: { userId: 'admin-1', role: 'ADMIN', organizationId: testOrgId },
    });
    console.log('[test 1] PASS: Admin rollback succeeded');
  } catch (err: any) {
    console.log('[test 1] FAIL:', err.message);
  }

  // Reset for next test
  await KnowledgeRecordModel.updateOne({ processingId: testProcessingId }, { reviewStatus: 'APPROVED', version: 2 });
  await ReviewHistory.create({
    processingId: testProcessingId,
    organizationId: testOrgId,
    reviewerId: 'admin-1',
    reviewerRole: 'ADMIN',
    action: 'APPROVED',
    version: 2,
    timestamp: new Date(),
  });

  // Test 2: Owner can rollback
  console.log('\n[test 2] Owner rollback...');
  try {
    await reviewService.rollback({
      processingId: testProcessingId,
      reviewer: { userId: ownerUserId, role: 'STUDENT', organizationId: testOrgId },
    });
    console.log('[test 2] PASS: Owner rollback succeeded');
  } catch (err: any) {
    console.log('[test 2] FAIL:', err.message);
  }

  // Reset for next test
  await KnowledgeRecordModel.updateOne({ processingId: testProcessingId }, { reviewStatus: 'APPROVED', version: 3 });
  await ReviewHistory.create({
    processingId: testProcessingId,
    organizationId: testOrgId,
    reviewerId: 'admin-1',
    reviewerRole: 'ADMIN',
    action: 'APPROVED',
    version: 3,
    timestamp: new Date(),
  });

  // Test 3: Non-owner cannot rollback
  console.log('\n[test 3] Non-owner rollback (should fail)...');
  try {
    await reviewService.rollback({
      processingId: testProcessingId,
      reviewer: { userId: otherUserId, role: 'STUDENT', organizationId: testOrgId },
    });
    console.log('[test 3] FAIL: Non-owner rollback should have been rejected');
  } catch (err: any) {
    if (err.message.includes('you can only rollback documents that you uploaded')) {
      console.log('[test 3] PASS: Non-owner rollback correctly rejected:', err.message);
    } else {
      console.log('[test 3] FAIL: Unexpected error:', err.message);
    }
  }

  // Test 4: canRollback endpoint logic
  console.log('\n[test 4] canRollback checks...');
  const adminCheck = await reviewService.canRollback(testProcessingId, { userId: 'admin-1', role: 'ADMIN', organizationId: testOrgId });
  console.log('[test 4a] Admin canRollback:', adminCheck);

  const ownerCheck = await reviewService.canRollback(testProcessingId, { userId: ownerUserId, role: 'STUDENT', organizationId: testOrgId });
  console.log('[test 4b] Owner canRollback:', ownerCheck);

  const otherCheck = await reviewService.canRollback(testProcessingId, { userId: otherUserId, role: 'STUDENT', organizationId: testOrgId });
  console.log('[test 4c] Other user canRollback:', otherCheck);

  // Cleanup
  console.log('\n[verify] Cleaning up test data...');
  await UaipUpload.deleteOne({ processingId: testProcessingId });
  await KnowledgeRecordModel.deleteOne({ processingId: testProcessingId });
  await ReviewHistory.deleteMany({ processingId: testProcessingId });

  await disconnect();
  console.log('\n[verify] Verification complete');
}

run().catch(err => {
  console.error('[verify] Fatal error:', err);
  process.exit(1);
});
