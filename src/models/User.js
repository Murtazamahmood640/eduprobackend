const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true  // Admins won't have a Firebase UID
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    // Only used for admin accounts. Students/Teachers use Firebase.
    type: String,
    default: null
  },
  name: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'superadmin', 'employee_admin'],
    default: 'student'
  },
  permissions: {
    type: [String],
    default: []
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Teacher Profile Fields
  bio: {
    type: String,
    default: ''
  },
  specialization: {
    type: String,
    default: ''
  },
  experience: {
    type: String,
    default: ''
  },
  introVideo: {
    type: String,
    default: ''
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  hourlyRate: {
    type: Number,
    default: 0
  },
  availableDays: {
    type: [String],
    default: []
  },
  qualification: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: ''
  },
  linkedin: {
    type: String,
    default: ''
  },
  youtube: {
    type: String,
    default: ''
  },
  github: {
    type: String,
    default: ''
  },
  portfolio: {
    type: String,
    default: ''
  },
  education: {
    type: String,
    default: ''
  },
  workHistory: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
