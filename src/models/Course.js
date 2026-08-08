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
  originalPrice: {
    type: Number,
    default: 0
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  accessType: {
    type: String,
    enum: ['lifetime', 'subscription', 'limited'],
    default: 'lifetime'
  },
  isFree: {
    type: Boolean,
    default: false
  },
  resources: [{
    type: String
  }],
  thumbnail: {
    type: String
  },
  introVideoUrl: {
    type: String
  },
  outline: [{
    module: String,
    sectionTitle: String,
    title: String,
    description: String,
    videoUrl: String,
    pdfUrl: String,
    textContent: String,
    assignment: {
      title: String,
      description: String,
      points: Number
    }
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
