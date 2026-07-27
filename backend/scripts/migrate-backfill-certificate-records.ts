/**
 * MIGRATION: Backfill CertificateRecord for already-approved KnowledgeRecords
 * 
 * Problem: KnowledgeRecords approved BEFORE the 'certificates' module injection fix
 * was deployed have no CertificateRecord. This script creates them.
 * 
 * Target: processingId = 611a973f-b704-4fb6-b210-add637384ebd (OWASP cert, Aashish)
 */

import mongoose from 'mongoose';
import { connectDB } from '../src/config';
import { Person } from '../src/models/Person';
import User from '../src/models/User';
import { UaipUpload } from '../src/models/UaipUpload';
import { KnowledgeRecordModel } from '../src/models/KnowledgeRecord';
import { CertificateRecord } from '../src/models/CertificateRecord';
import { GrowthProfileService } from '../src/modules/growth/growthProfile.service';

async function migrateApprovedCertificates() {
  await connectDB();
  console.log('\n=== MIGRATION: Backfill CertificateRecords for approved KnowledgeRecords ===\n');

  // --- STEP 1: Find the OWASP KnowledgeRecord ---
  const targetProcessingId = '611a973f-b704-4fb6-b210-add637384ebd';
  const kr = await KnowledgeRecordModel.findOne({ processingId: targetProcessingId }).lean() as any;

  if (!kr) {
    console.error('❌ KnowledgeRecord not found for processingId:', targetProcessingId);
    process.exit(1);
  }

  console.log('STEP 1 — KnowledgeRecord found:');
  console.log('  _id:', kr._id);
  console.log('  processingId:', kr.processingId);
  console.log('  documentCategory:', kr.documentCategory);
  console.log('  reviewStatus:', kr.reviewStatus);
  console.log('  confidenceScore:', kr.confidenceScore);
  console.log('  candidateFields:', JSON.stringify(kr.candidateFields, null, 4));

  if (kr.reviewStatus !== 'APPROVED') {
    console.error('❌ KnowledgeRecord is not APPROVED. Status:', kr.reviewStatus);
    process.exit(1);
  }

  // --- STEP 2: Find the UaipUpload to get userId (document owner) ---
  const upload = await UaipUpload.findOne({ processingId: targetProcessingId }).lean() as any;
  console.log('\nSTEP 2 — UaipUpload lookup:');

  let userId: string | null = null;
  let orgId: string | null = null;

  if (upload) {
    userId = upload.userId?.toString();
    orgId = upload.organizationId?.toString();
    console.log('  Found upload. userId (owner):', userId);
    console.log('  orgId from upload:', orgId);
    console.log('  fileName:', upload.fileName);
    console.log('  status:', upload.status);
  } else {
    console.log('  ⚠️  No UaipUpload found for processingId. Using fallback values.');
    const aashish = await User.findOne({ email: '2023329421.aashish@ug.sharda.ac.in' }).lean() as any;
    userId = aashish?._id?.toString() ?? null;
    orgId = aashish?.organizationId?.toString() ?? null;
    console.log('  Fallback userId:', userId, 'orgId:', orgId);
  }

  if (!userId || !orgId) {
    console.error('❌ Cannot resolve userId or orgId. Aborting.');
    process.exit(1);
  }

  // --- STEP 3: Resolve Person for userId ---
  const person = await Person.findOne({
    userIds: new mongoose.Types.ObjectId(userId),
    organizationId: new mongoose.Types.ObjectId(orgId),
  }).lean() as any;

  console.log('\nSTEP 3 — Person resolution:');
  if (!person) {
    console.error('❌ No Person found for userId:', userId, 'orgId:', orgId);
    process.exit(1);
  }
  const personId = person._id.toString();
  console.log('  personId:', personId);
  console.log('  primaryName:', person.primaryName);
  console.log('  primaryEmail:', person.primaryEmail);

  // --- STEP 4: Check if CertificateRecord already exists ---
  const existing = await CertificateRecord.findOne({
    sourceDocumentId: kr._id,
    organizationId: new mongoose.Types.ObjectId(orgId),
  }).lean() as any;

  if (existing) {
    console.log('\nSTEP 4 — CertificateRecord already exists:');
    console.log('  _id:', existing._id);
    console.log('  title:', existing.title);
    console.log('  personId:', existing.personId?.toString());
    console.log('  ✅ No migration needed.');
  } else {
    console.log('\nSTEP 4 — No CertificateRecord found. Creating now...');

    // Extract fields from candidateFields
    const cf = kr.candidateFields ?? {};
    const title =
      cf.certificateTitle ??
      cf.title ??
      cf.certificateName ??
      cf.courseName ??
      cf.workshopName ??
      cf.name ??
      'Unknown Certificate';

    const issuer =
      cf.issuer ??
      cf.issuingOrganization ??
      cf.organization ??
      cf.institute ??
      cf.university ??
      'Unknown Issuer';

    let issuedDate: Date | undefined;
    if (cf.issueDate) {
      const parsed = new Date(cf.issueDate);
      if (!isNaN(parsed.getTime())) issuedDate = parsed;
    }

    const certRecord = await CertificateRecord.create({
      organizationId: new mongoose.Types.ObjectId(orgId),
      personId: new mongoose.Types.ObjectId(personId),
      sourceDocumentId: kr._id,
      title,
      issuer,
      issuedDate,
      credentialId: cf.credentialId ?? undefined,
      rawConfidence: kr.confidenceScore ?? 0.9,
    });

    console.log('  ✅ CertificateRecord created!');
    console.log('  _id:', certRecord._id.toString());
    console.log('  title:', certRecord.title);
    console.log('  issuer:', certRecord.issuer);
    console.log('  personId:', certRecord.personId?.toString());
    console.log('  organizationId:', certRecord.organizationId?.toString());
    console.log('  issuedDate:', certRecord.issuedDate);
    console.log('  rawConfidence:', certRecord.rawConfidence);
  }

  // --- STEP 5: Verify GET /api/growth/profile/me now returns the certificate ---
  console.log('\nSTEP 5 — Verifying GrowthProfileService.getProfile returns certificate:');
  const growthProfileService = new GrowthProfileService();
  const profile = await growthProfileService.getProfile(orgId, userId);

  console.log('  certRecsFound:', profile.certificates?.length ?? 0);
  if (profile.certificates?.length > 0) {
    console.log('  ✅ VERIFIED: GET /api/growth/profile/me returns:');
    profile.certificates.forEach((c: any) => {
      console.log('    title:', c.title);
      console.log('    issuer:', c.issuer);
      console.log('    issuedDate:', c.issuedDate);
      console.log('    id:', c.id);
    });
  } else {
    console.log('  ❌ Still returning empty. Something is still wrong.');
  }

  await mongoose.disconnect();
  console.log('\n=== MIGRATION COMPLETE ===');
}

migrateApprovedCertificates().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
