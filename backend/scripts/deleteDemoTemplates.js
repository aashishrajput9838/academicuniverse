require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection;
    const result = await db.collection('resumetemplates').deleteMany({ fileUrl: 'https://calibre-ebook.com/downloads/demos/demo.docx' });
    console.log(`Deleted ${result.deletedCount} demo templates`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
