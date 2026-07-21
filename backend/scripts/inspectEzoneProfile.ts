import mongoose, { Types } from 'mongoose';

async function inspect() {
  try {
    await mongoose.connect('mongodb://localhost:27017/academic_universe');
    const db = mongoose.connection.db;
    
    // Find the single existing EzoneAcademicProfile
    const doc = await db.collection('ezoneacademicprofiles').findOne({});
    console.log('=== Only EzoneAcademicProfile in DB ===');
    console.log(JSON.stringify(doc, null, 2));
    console.log('');
    
    // Check if the target user exists
    const user = await db.collection('users').findOne({
      _id: new Types.ObjectId('6a58b65d816b680ebffb8b89')
    });
    console.log('=== Target User ===');
    if (user) {
      console.log(JSON.stringify({
        _id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        roleId: user.roleId
      }, null, 2));
    } else {
      console.log('User NOT FOUND');
    }
    console.log('');
    
    // Check resume templates for this org
    const templates = await db.collection('resumetemplates').find({
      organizationId: '6a58b59aa8c379340d290b31'
    }).toArray();
    console.log('=== Resume Templates for Org ===');
    console.log(`Count: ${templates.length}`);
    templates.forEach(t => {
      console.log(JSON.stringify({
        _id: t._id,
        templateName: t.templateName,
        type: t.type,
        target: t.target,
        uploadedBy: t.uploadedBy
      }, null, 2));
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

inspect();
