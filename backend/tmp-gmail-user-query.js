const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'academic_universe',
    });
    const users = await User.find({
      'gmailTokens': { $exists: true, $ne: null },
      'firebaseUid': { $exists: true, $ne: null },
    })
      .select('email firebaseUid gmailTokens.expiryDate gmailTokens.accessToken gmailTokens.refreshToken')
      .lean()
      .limit(10);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
