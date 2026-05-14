const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  certificateId: {
    type: String,
    unique: true,
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  grade: {
    type: String,
    default: 'Distinction'
  },
  verificationUrl: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
