require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection;
    const templates = await db.collection('resumetemplates').find({}).toArray();
    console.log("TEMPLATES:", JSON.stringify(templates, null, 2));

    const users = await db.collection('users').find({ name: { $regex: 'aashish|vamsi', $options: 'i' } }).toArray();
    console.log("USERS:", JSON.stringify(users.map(u => ({ email: u.email, name: u.name, org: u.organizationId, role: u.roleId })), null, 2));

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
