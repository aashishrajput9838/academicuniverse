// backend/dumpAllUploads.ts
import * as path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });

import { connectDB } from './src/config/database';
import { UaipUpload } from './src/models/UaipUpload';
import { KnowledgeRecordModel } from './src/models/KnowledgeRecord';

async function main() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const uploads = await UaipUpload.find().sort({ createdAt: -1 }).lean();
  console.log(`Found ${uploads.length} UaipUpload documents:`);
  
  for (const upload of uploads) {
    const kr = await KnowledgeRecordModel.findOne({ processingId: upload.processingId }).lean();
    console.log(`\n--------------------------------------------`);
    console.log(`Upload ID: ${upload.processingId}`);
    console.log(`File Name: ${upload.fileName}`);
    console.log(`Status:    ${upload.status}`);
    console.log(`User ID:   ${upload.userId}`);
    console.log(`Created:   ${upload.createdAt}`);
    if (kr) {
      console.log(`KR Category:   ${kr.documentCategory}`);
      console.log(`KR Confidence: ${kr.confidenceScore}`);
      console.log(`KR Summary:    ${kr.summary}`);
      console.log(`KR CandidateFields: ${JSON.stringify(kr.candidateFields)}`);
    } else {
      console.log(`No KnowledgeRecord found.`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
