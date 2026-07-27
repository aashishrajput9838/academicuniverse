import mongoose from 'mongoose';
import { connectDB } from '../src/config';
import { KnowledgeRecordModel } from '../src/models/KnowledgeRecord';
import { UaipUpload } from '../src/models/UaipUpload';
import { Person } from '../src/models/Person';
import User from '../src/models/User';

async function run() {
  await connectDB();

  const kr = await KnowledgeRecordModel.findOne({ processingId: '611a973f-b704-4fb6-b210-add637384ebd' }).lean() as any;
  console.log('=== FULL KnowledgeRecord ===');
  console.log(JSON.stringify(kr, null, 2));

  const upload = await UaipUpload.findOne({ processingId: '611a973f-b704-4fb6-b210-add637384ebd' }).lean() as any;
  console.log('\n=== FULL UaipUpload ===');
  console.log(JSON.stringify(upload, null, 2));

  if (upload?.userId) {
    const userId = upload.userId.toString();
    const orgId = upload.organizationId?.toString();
    console.log('\n=== Looking up Person for userId:', userId, 'orgId:', orgId, '===');

    // Try without orgId filter
    const persons = await Person.find({ userIds: upload.userId }).lean();
    console.log('Person.find({userIds}) result:', JSON.stringify(persons, null, 2));

    // Try all persons in org
    if (orgId) {
      const orgPersons = await Person.find({ organizationId: new mongoose.Types.ObjectId(orgId) }).lean();
      console.log('\nAll Persons in org:', JSON.stringify(orgPersons.map((p: any) => ({
        _id: p._id, primaryName: p.primaryName, userIds: p.userIds
      })), null, 2));
    }

    const user = await User.findById(upload.userId).lean() as any;
    console.log('\nUser:', JSON.stringify({ _id: user?._id, email: user?.email, organizationId: user?.organizationId }, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
