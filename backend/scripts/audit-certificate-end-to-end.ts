import mongoose from 'mongoose';
import { connectDB } from '../src/config';
import { Person } from '../src/models/Person';
import User from '../src/models/User';
import { UaipUpload } from '../src/models/UaipUpload';
import { KnowledgeRecordModel } from '../src/models/KnowledgeRecord';
import { CertificateRecord } from '../src/models/CertificateRecord';
import { ReviewService } from '../src/shared/services/review.service';
import { GrowthProfileService } from '../src/modules/growth/growthProfile.service';

async function testPipeline() {
  await connectDB();
  console.log('--- STARTING END-TO-END PIPELINE AUDIT ---');

  const testOrgId = '64c58cfcb6fcd8ef57c0e5a1';
  let testUser = await User.findOne({ email: 'test_student_cert@academicuniverse.edu' });
  if (!testUser) {
    testUser = await User.create({
      name: 'Test Student Cert',
      email: 'test_student_cert@academicuniverse.edu',
      organizationId: new mongoose.Types.ObjectId(testOrgId),
      passwordHash: 'hash',
      roleId: new mongoose.Types.ObjectId('64c58cfcb6fcd8ef57c0e5a2'),
    });
  }

  const userIdStr = testUser._id.toString();

  // Create Person linked to student
  let person = await Person.findOne({ organizationId: new mongoose.Types.ObjectId(testOrgId), userIds: testUser._id });
  if (!person) {
    person = await Person.create({
      organizationId: new mongoose.Types.ObjectId(testOrgId),
      primaryName: 'Test Student Cert',
      primaryEmail: 'test_student_cert@academicuniverse.edu',
      userIds: [testUser._id],
    });
  }

  console.log('1. Student User ID:', userIdStr);
  console.log('1. Student Person ID:', person._id.toString());

  const processingId = 'proc_cert_test_' + Date.now();

  // Create UaipUpload & KnowledgeRecord
  const upload = await UaipUpload.create({
    processingId,
    organizationId: new mongoose.Types.ObjectId(testOrgId),
    userId: testUser._id,
    fileName: 'aws_certified_cloud_practitioner.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    fileHash: 'audit_hash_' + Date.now(),
    storageId: 'stor_123',
    status: 'SUCCESS',
  });

  const kr = await KnowledgeRecordModel.create({
    processingId,
    organizationId: new mongoose.Types.ObjectId(testOrgId),
    fileName: 'aws_certified_cloud_practitioner.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    storageId: 'stor_123',
    parserStrategy: 'PDF_PARSER',
    isScanned: false,
    language: 'en',
    documentCategory: 'CERTIFICATE',
    confidenceScore: 0.95,
    summary: 'AWS Certified Cloud Practitioner Certificate',
    candidateFields: {
      certificateTitle: 'AWS Certified Cloud Practitioner',
      title: 'AWS Certified Cloud Practitioner',
      candidateName: 'Test Student Cert',
      issuer: 'Amazon Web Services',
      issuingOrganization: 'Amazon Web Services',
      issueDate: '2025-06-10',
      credentialId: 'AWS-CCP-998877',
    },
    routingDecision: {
      documentType: 'CERTIFICATE',
      primaryModule: 'career_profile',
      secondaryModules: [],
      routingConfidence: 0.95,
      reasoning: 'Routed to career_profile',
    },
    reviewStatus: 'PENDING_REVIEW',
  });

  console.log('2. Created test upload & KnowledgeRecord:', processingId);

  // Invoke Approve
  const reviewService = new ReviewService();
  const approveResult = await reviewService.approve({
    processingId,
    reviewer: {
      userId: userIdStr,
      organizationId: testOrgId,
      role: 'STUDENT',
    },
  });

  console.log('3. Review approval result:', JSON.stringify(approveResult));

  // Query MongoDB CertificateRecord
  const certsInMongo = await CertificateRecord.find({
    organizationId: new mongoose.Types.ObjectId(testOrgId),
    personId: person._id,
  }).lean();

  console.log('4. MongoDB CertificateRecord query result:', JSON.stringify(certsInMongo, null, 2));

  // Query Growth Profile API
  const growthProfileService = new GrowthProfileService();
  const profileResult = await growthProfileService.getProfile(testOrgId, userIdStr);

  console.log('5. GET /api/growth/profile/me result certificates:', JSON.stringify(profileResult.certificates, null, 2));

  await mongoose.disconnect();
}

testPipeline().catch(err => {
  console.error('Test pipeline error:', err);
  process.exit(1);
});
