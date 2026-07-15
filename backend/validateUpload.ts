// backend/validateUpload.ts
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { connectDB } from './src/config/database';
import { UaipFacade } from './src/shared/application/UaipFacade';
import { UaipUpload } from './src/models/UaipUpload';
import { KnowledgeRecordModel } from './src/models/KnowledgeRecord';
import { AcademicRecord } from './src/models/AcademicRecord';
import { Person } from './src/models/Person';
import { DocumentModel } from './src/models/Document';

async function main() {
  console.log('=== Starting E2E E2E Pipeline Validation ===');

  // 1. Connect to Database
  await connectDB();
  console.log('Connected to MongoDB database.');

  // 2. Count canonical records before processing
  const academicRecordsBefore = await AcademicRecord.countDocuments();
  const personsBefore = await Person.countDocuments();
  console.log(`Initial Canonical Counts: AcademicRecords=${academicRecordsBefore}, Persons=${personsBefore}`);

  // 3. Read the validation xls file
  const filePath = path.resolve(__dirname, 'src', 'input data', 'download.xls');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test file not found at ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  console.log(`Loaded file: ${path.basename(filePath)} (${buffer.length} bytes)`);

  // 4. Initialize Facade and Submit Document
  const facade = new UaipFacade();
  const testUserId = '64c58cfcb6fcd8ef57c0e5a8'; // mock ObjectId
  const testOrgId = '64c58cfcb6fcd8ef57c0e5a9';  // mock ObjectId

  console.log('Submitting document to UAIP Facade...');
  const { processingId } = await facade.submitDocument({
    buffer,
    originalName: 'download.xls',
    mimeType: 'application/vnd.ms-excel',
    size: buffer.length,
    userId: testUserId,
    organizationId: testOrgId,
  });

  console.log(`Document submitted successfully. processingId = ${processingId}`);

  // 5. Poll for pipeline completion
  console.log('Polling pipeline status...');
  let statusDoc: any = null;
  const timeoutMs = 60000; // 60s max
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    statusDoc = await UaipUpload.findOne({ processingId }).lean();
    if (statusDoc && (statusDoc.status === 'SUCCESS' || statusDoc.status === 'FAILED')) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!statusDoc) {
    throw new Error('Pipeline timed out or status document not found');
  }

  console.log(`Pipeline finished with status: ${statusDoc.status}`);
  if (statusDoc.errorMessage) {
    console.error(`Pipeline error message: ${statusDoc.errorMessage}`);
  }

  // Allow a brief moment for any final background updates to settle
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 6. Fetch KnowledgeRecord
  const krDoc = await KnowledgeRecordModel.findOne({ processingId }).lean();

  console.log('\n=============================================');
  console.log('DATABASE OUTPUTS');
  console.log('=============================================');

  console.log('1. UaipUpload Document:');
  console.log(JSON.stringify(statusDoc, null, 2));

  console.log('\n2. KnowledgeRecord Document:');
  if (krDoc) {
    console.log(JSON.stringify(krDoc, null, 2));
  } else {
    console.log('NO KnowledgeRecord found for processingId.');
  }

  console.log('\n=============================================');
  console.log('AI OUTPUT ANALYSIS');
  console.log('=============================================');
  if (krDoc) {
    console.log(`Document Category: ${krDoc.documentCategory}`);
    console.log(`Confidence Score:  ${krDoc.confidenceScore}`);
    console.log(`Summary:           ${krDoc.summary}`);
    console.log(`Suggested Module:  ${krDoc.suggestedModule}`);
    console.log(`Extracted Entities:`, JSON.stringify(krDoc.extractedEntities, null, 2));
    console.log(`Candidate Fields:  `, JSON.stringify(krDoc.candidateFields, null, 2));
  } else {
    console.log('No AI outputs to display since KnowledgeRecord is missing.');
  }

  // 7. Verify canonical collections are unmodified
  const academicRecordsAfter = await AcademicRecord.countDocuments();
  const personsAfter = await Person.countDocuments();
  console.log('\n=============================================');
  console.log('CANONICAL LAYER AUDIT');
  console.log('=============================================');
  console.log(`AcademicRecords count: before = ${academicRecordsBefore}, after = ${academicRecordsAfter}`);
  console.log(`Persons count:         before = ${personsBefore}, after = ${personsAfter}`);

  if (academicRecordsBefore === academicRecordsAfter && personsBefore === personsAfter) {
    console.log('SUCCESS: Verified no changes were made to canonical collections.');
  } else {
    console.error('WARNING: Canonical collections were modified during pipeline run!');
  }

  // Disconnect from database
  await mongoose.disconnect();
  console.log('\nDisconnected from database. Validation complete.');
}

main().catch((err) => {
  console.error('Validation script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
