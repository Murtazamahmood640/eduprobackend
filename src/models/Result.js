const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    required: true
  },
  examDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft'
  }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
