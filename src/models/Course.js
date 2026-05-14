const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    default: 0
  },
  thumbnail: {
    type: String
  },
  introVideoUrl: {
    type: String
  },
  outline: [{
    sectionTitle: String,
    title: String,
    description: String,
    videoUrl: String,
    pdfUrl: String,
    textContent: String
  }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
