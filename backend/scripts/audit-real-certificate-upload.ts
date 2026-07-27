import mongoose from 'mongoose';
import { connectDB } from '../src/config';
import { Person } from '../src/models/Person';
import User from '../src/models/User';
import { UaipUpload } from '../src/models/UaipUpload';
import { KnowledgeRecordModel } from '../src/models/KnowledgeRecord';
import { CertificateRecord } from '../src/models/CertificateRecord';
import { GrowthProfileService } from '../src/modules/growth/growthProfile.service';
import { ReviewService } from '../src/shared/services/review.service';

async function auditRealUpload() {
  await connectDB();
  console.log('\n=== REAL UPLOAD AUDIT: Aashish Rajput OWASP Certificate ===\n');

  // Step 1: Find Aashish's User account
  const user = await User.findOne({ email: '2023329421.aashish@ug.sharda.ac.in' }).lean();
  if (!user) {
    // try any user with name matching
    const allUsers = await User.find().lean();
    console.log('All users in DB:');
    allUsers.forEach(u => console.log(' -', u.email, '|', u._id));
    await mongoose.disconnect();
    return;
  }
  const userId = user._id.toString();
  const orgId = (user as any).organizationId?.toString();
  console.log('STEP 1 — User found:');
  console.log('  userId:', userId);
  console.log('  orgId:', orgId);
  console.log('  email:', (user as any).email);

  // Step 2: Find Person for this user
  const person = await Person.findOne({ userIds: user._id }).lean();
  const personId = person ? (person._id as any).toString() : null;
  console.log('\nSTEP 2 — Person record:');
  console.log('  personId:', personId);
  console.log('  primaryName:', (person as any)?.primaryName);
  console.log('  primaryEmail:', (person as any)?.primaryEmail);

  // Step 3: Find all UaipUploads for this user
  const uploads = await UaipUpload.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  console.log('\nSTEP 3 — UaipUploads for this user (' + uploads.length + ' found):');
  uploads.forEach((u: any) => {
    console.log('  processingId:', u.processingId);
    console.log('  fileName:', u.fileName);
    console.log('  status:', u.status);
    console.log('  createdAt:', u.createdAt);
    console.log('  ---');
  });

  // Step 4: Find all KnowledgeRecords for this user's processingIds (or by orgId)
  const processingIds = uploads.map((u: any) => u.processingId);
  const krs = await KnowledgeRecordModel.find({
    $or: [
      { processingId: { $in: processingIds } },
      { organizationId: new mongoose.Types.ObjectId(orgId) },
    ],
    documentCategory: 'CERTIFICATE',
  }).sort({ createdAt: -1 }).lean();

  console.log('\nSTEP 4 — KnowledgeRecords (CERTIFICATE category, ' + krs.length + ' found):');
  krs.forEach((kr: any) => {
    console.log('  processingId:', kr.processingId);
    console.log('  fileName:', kr.fileName);
    console.log('  documentCategory:', kr.documentCategory);
    console.log('  reviewStatus:', kr.reviewStatus);
    console.log('  confidenceScore:', kr.confidenceScore);
    console.log('  candidateFields:', JSON.stringify(kr.candidateFields, null, 4));
    console.log('  routingDecision:', JSON.stringify(kr.routingDecision, null, 4));
    console.log('  ---');
  });

  // Step 5: Find any CertificateRecord for this person
  const query: any = {};
  if (orgId) query.organizationId = new mongoose.Types.ObjectId(orgId);
  if (personId) query.personId = new mongoose.Types.ObjectId(personId);
  const certRecs = await CertificateRecord.find(query).sort({ createdAt: -1 }).lean();
  console.log('\nSTEP 5 — CertificateRecords for personId=' + personId + ' (' + certRecs.length + ' found):');
  if (certRecs.length === 0) {
    console.log('  ⚠️  NO CertificateRecord exists for this person! Pipeline did not run or personId mismatch.');
  }
  certRecs.forEach((c: any) => {
    console.log('  _id:', c._id);
    console.log('  title:', c.title);
    console.log('  issuer:', c.issuer);
    console.log('  personId:', c.personId?.toString());
    console.log('  organizationId:', c.organizationId?.toString());
    console.log('  sourceDocumentId:', c.sourceDocumentId?.toString());
    console.log('  createdAt:', c.createdAt);
    console.log('  ---');
  });

  // Step 6: Also search ALL CertificateRecords in the org to detect wrong personId
  const allCertRecs = await CertificateRecord.find({
    organizationId: new mongoose.Types.ObjectId(orgId),
  }).sort({ createdAt: -1 }).lean();
  console.log('\nSTEP 6 — ALL CertificateRecords in org (' + allCertRecs.length + ' total):');
  allCertRecs.forEach((c: any) => {
    console.log('  _id:', c._id, '| personId:', c.personId?.toString(), '| title:', c.title, '| issuer:', c.issuer);
  });

  // Step 7: Call Growth Profile API
  console.log('\nSTEP 7 — GrowthProfileService.getProfile(orgId, userId):');
  const growthProfileService = new GrowthProfileService();
  const profile = await growthProfileService.getProfile(orgId, userId);
  console.log('  certificates:', JSON.stringify(profile.certificates, null, 4));
  console.log('  certifications:', JSON.stringify((profile as any).certifications, null, 4));

  // Step 8: Check if any KR for OWASP cert is still PENDING_REVIEW (needs approval)
  const pendingKrs = await KnowledgeRecordModel.find({
    organizationId: new mongoose.Types.ObjectId(orgId),
    documentCategory: 'CERTIFICATE',
    reviewStatus: 'PENDING_REVIEW',
  }).lean();
  console.log('\nSTEP 8 — Pending review KnowledgeRecords (' + pendingKrs.length + ' found):');
  pendingKrs.forEach((kr: any) => {
    console.log('  processingId:', kr.processingId, '| fileName:', kr.fileName, '| reviewStatus:', kr.reviewStatus);
  });

  await mongoose.disconnect();
  console.log('\n=== AUDIT COMPLETE ===');
}

auditRealUpload().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
