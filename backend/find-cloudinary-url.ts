import mongoose from 'mongoose';
import ResumeTemplate from './src/models/ResumeTemplate';

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const templates = await ResumeTemplate.find({ fileUrl: { $regex: 'cloudinary', $options: 'i' } }).limit(5).lean();
  console.log(`Found ${templates.length} templates with cloudinary URLs`);
  templates.forEach((t: any, i: number) => {
    console.log(`\n--- Template ${i + 1} ---`);
    console.log('_id:', t._id);
    console.log('templateName:', t.templateName);
    console.log('fileUrl:', t.fileUrl);
    console.log('originalFileUrl:', t.originalFileUrl || 'N/A');
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
