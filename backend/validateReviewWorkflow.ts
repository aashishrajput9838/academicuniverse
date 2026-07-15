// backend/validateReviewWorkflow.ts
import * as path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { connectDB } from './src/config/database';
import { ReviewService } from './src/shared/services/review.service';
import { UaipUpload } from './src/models/UaipUpload';
import { KnowledgeRecordModel } from './src/models/KnowledgeRecord';
import { ReviewHistory } from './src/models/ReviewHistory';
import { AcademicRecord } from './src/models/AcademicRecord';
import { AcademicSchedule } from './src/models/AcademicSchedule';
import { Person } from './src/models/Person';

async function main() {
  console.log('=== Starting Human-in-the-Loop Workflow E2E Validation ===');

  await connectDB();
  console.log('Connected to MongoDB database.');

  // Find a successful upload to run the test on
  const latestUpload = await UaipUpload.findOne({ status: 'SUCCESS' }).sort({ createdAt: -1 }).lean() as any;
  if (!latestUpload) {
    console.error('Error: No successful UaipUpload found. Please run validateUpload.ts first to create a completed ingestion.');
    process.exit(1);
  }

  const { processingId, userId, organizationId } = latestUpload;
  console.log(`Using processingId: ${processingId} for organization: ${organizationId}`);

  // Fetch initial knowledge record
  let kr = await KnowledgeRecordModel.findOne({ processingId }).lean() as any;
  if (!kr) {
    console.error('Error: KnowledgeRecord not found for processingId.');
    process.exit(1);
  }

  // Force reset status to PENDING_REVIEW and version to 1 for clean validation test
  await KnowledgeRecordModel.updateOne({ processingId }, { $set: { reviewStatus: 'PENDING_REVIEW', version: 1 } });
  await ReviewHistory.deleteMany({ processingId });
  console.log('Cleaned up previous review history and set status to PENDING_REVIEW, version 1.');

  const reviewerContext = {
    userId,
    role: 'FACULTY',
    organizationId,
  };

  const adminContext = {
    userId: 'mock-admin-id-999',
    role: 'ADMIN',
    organizationId,
  };

  const reviewService = new ReviewService();

  // ── 1. GET INITIAL CANDIDATE STATE ──
  console.log('\n--- Step 1: Getting Candidate State ---');
  let state = await reviewService.getCandidateState(processingId, organizationId);
  console.log(`Initial Status: ${state.reviewStatus}, Version: ${state.version}`);
  console.log(`Category: ${state.documentCategory}`);

  // ── 2. SAVE DRAFT ──
  console.log('\n--- Step 2: Saving Draft Edits ---');
  const mockEditedFields = {
    ...state.candidateFields,
    academicYear: '2026-2027',
    semester: 'Fall 2026',
    branch: 'Computer Science and Engineering',
  };

  const draftResult = await reviewService.saveDraft({
    processingId,
    editedFields: mockEditedFields,
    reviewer: reviewerContext,
  });
  console.log(`Draft Saved. New version = ${draftResult.version}`);

  state = await reviewService.getCandidateState(processingId, organizationId);
  console.log(`Verified Status: ${state.reviewStatus} (Expected: PENDING_REVIEW)`);
  console.log(`Verified Version: ${state.version} (Expected: 2)`);
  console.log(`Verified Draft Field (branch): ${state.candidateFields.branch}`);

  // ── 3. APPROVE DOCUMENT (CANONICAL WRITE) ──
  console.log('\n--- Step 3: Approving Document ---');
  
  // Clean up any existing canonical documents to get clean count checks
  const person = await Person.findOne({ organizationId, userIds: userId }).lean() as any;
  if (person) {
    if (state.documentCategory === 'ACADEMIC_TIMETABLE') {
      await AcademicSchedule.deleteMany({ organizationId, personId: person._id });
    } else {
      await AcademicRecord.deleteMany({ organizationId, personId: person._id });
    }
  }

  const approveResult = await reviewService.approve({
    processingId,
    reviewer: reviewerContext,
  });

  console.log('Approve Successful!');
  console.log(`Canonical Collection: ${approveResult.canonicalCollection}`);
  console.log(`Canonical Record IDs:  `, approveResult.canonicalRecordIds);

  state = await reviewService.getCandidateState(processingId, organizationId);
  console.log(`Verified Status: ${state.reviewStatus} (Expected: APPROVED)`);
  console.log(`Verified Version: ${state.version} (Expected: 3)`);

  // Verify the canonical database matches
  if (approveResult.canonicalCollection === 'AcademicSchedule') {
    const canonicalSchedule = await AcademicSchedule.findOne({ sourceProcessingId: processingId }).lean() as any;
    console.log(`Verified Canonical AcademicSchedule count inside DB = ${canonicalSchedule ? 1 : 0}`);
    console.log(`Approved Events count: ${canonicalSchedule?.schedule?.[0]?.events?.length ?? 0}`);
  } else if (approveResult.canonicalCollection === 'AcademicRecord') {
    const count = await AcademicRecord.countDocuments({ sourceDocumentId: latestUpload._id });
    console.log(`Verified Canonical AcademicRecord count inside DB = ${count}`);
  }

  // ── 4. ROLLBACK APPROVAL (ADMIN ONLY) ──
  console.log('\n--- Step 4: Admin Rollback ---');
  await reviewService.rollback({
    processingId,
    reviewer: adminContext,
  });
  console.log('Rollback Successful!');

  state = await reviewService.getCandidateState(processingId, organizationId);
  console.log(`Verified Status: ${state.reviewStatus} (Expected: PENDING_REVIEW)`);
  console.log(`Verified Version: ${state.version} (Expected: 4)`);

  if (approveResult.canonicalCollection === 'AcademicSchedule') {
    const canonicalSchedule = await AcademicSchedule.findOne({ sourceProcessingId: processingId }).lean();
    console.log(`Verified AcademicSchedule exists in DB post-rollback = ${!!canonicalSchedule} (Expected: false)`);
  } else if (approveResult.canonicalCollection === 'AcademicRecord') {
    const count = await AcademicRecord.countDocuments({ sourceDocumentId: latestUpload._id });
    console.log(`Verified AcademicRecord count in DB post-rollback = ${count} (Expected: 0)`);
  }

  // ── 5. REJECT DOCUMENT ──
  console.log('\n--- Step 5: Rejecting Document ---');
  await reviewService.reject({
    processingId,
    reason: 'Document schedule layout is corrupted.',
    reviewer: reviewerContext,
  });
  console.log('Rejection Successful!');

  state = await reviewService.getCandidateState(processingId, organizationId);
  console.log(`Verified Status: ${state.reviewStatus} (Expected: REJECTED)`);
  console.log(`Verified Version: ${state.version} (Expected: 5)`);

  // ── 6. GET REVIEW HISTORY (AUDIT TRAIL) ──
  console.log('\n--- Step 6: Fetching Immutable Review History ---');
  const history = await reviewService.getHistory(processingId, organizationId);
  console.log(`Total History Entries: ${history.entries.length} (Expected: 4)`);
  
  history.entries.reverse().forEach((entry, idx) => {
    console.log(`  [Event ${idx + 1}] Action: ${entry.action}, Version: ${entry.version}, Reviewer: ${entry.reviewerRole} (${entry.reviewerId})`);
    if (entry.rejectionReason) console.log(`           Reason: ${entry.rejectionReason}`);
    if (entry.canonicalCollection) console.log(`           Canonical Coll: ${entry.canonicalCollection}`);
  });

  await mongoose.disconnect();
  console.log('\nWorkflow validation complete. Disconnected from database.');
}

main().catch((err) => {
  console.error('Validation script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
