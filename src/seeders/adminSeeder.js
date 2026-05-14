require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateUserId } = require('../utils/generateUserId');

const ADMIN_EMAIL = 'murtazamahmood640@gmail.com';
const ADMIN_PASSWORD = 'Shoaib12$';
const ADMIN_NAME = 'Murtaza Mahmood';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`⚠️  Admin already exists with userId: ${existing.userId}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const userId = await generateUserId('admin');

    const admin = await User.create({
      userId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashed,
      role: 'superadmin',
      profilePicture: '',
      isEmailVerified: true
    });

    console.log('✅ Admin created successfully!');
    console.log(`   Email   : ${admin.email}`);
    console.log(`   User ID : ${admin.userId}`);
    console.log(`   Role    : ${admin.role}`);
  } catch (err) {
    console.error('❌ Seeder failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
