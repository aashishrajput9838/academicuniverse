// backend/testEndpoints.ts
import * as path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load env
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { connectDB } from './src/config/database';
import { GrowthUploadService } from './src/modules/growth/growthUpload.service';
import { UaipUpload } from './src/models/UaipUpload';
import { KnowledgeRecordModel } from './src/models/KnowledgeRecord';

async function main() {
  await connectDB();
  console.log('Connected to MongoDB database.');

  const testUserId = '64c58cfcb6fcd8ef57c0e5a8';
  const testOrgId = '64c58cfcb6fcd8ef57c0e5a9';

  const service = new GrowthUploadService();

  // 1. Fetch History
  console.log('\n--- Fetching History (getUploadHistory) ---');
  const history = await service.getUploadHistory({
    userId: testUserId,
    organizationId: testOrgId,
    limit: 5,
  });
  console.log(JSON.stringify(history, null, 2));

  // 2. Fetch Detailed Status for the first item (if exists)
  if (history.items.length > 0) {
    const firstItem = history.items[0];
    console.log(`\n--- Fetching Processing Status (getProcessingStatus) for ${firstItem.processingId} ---`);
    const status = await service.getProcessingStatus({
      userId: testUserId,
      organizationId: testOrgId,
      processingId: firstItem.processingId,
    });
    console.log(JSON.stringify(status, null, 2));

    console.log('\n--- Raw DB UaipUpload Document ---');
    const rawUpload = await UaipUpload.findOne({ processingId: firstItem.processingId }).lean();
    console.log(JSON.stringify(rawUpload, null, 2));

    console.log('\n--- Raw DB KnowledgeRecord Document ---');
    const rawKR = await KnowledgeRecordModel.findOne({ processingId: firstItem.processingId }).lean();
    console.log(JSON.stringify(rawKR, null, 2));
  } else {
    console.log('No history items found.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
