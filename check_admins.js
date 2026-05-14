const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function checkAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    const User = require('./src/models/User');
    const admins = await User.find({ role: { $in: ['admin', 'superadmin', 'employee_admin'] } });
    console.log('Admin Users found:', admins.length);
    admins.forEach(u => {
      console.log(`- ${u.name} (${u.email}) | Role: ${u.role} | FirebaseUID: ${u.firebaseUid || 'NONE'}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAdmins();
