const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseTitle: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  originalAmount: {
    type: Number
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    default: 'GBP'
  },
  paymentMethod: {
    type: String,
    enum: ['Credit / Debit Card', 'JazzCash', 'EasyPaisa', 'Bank Transfer'],
    default: 'Credit / Debit Card'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Completed', 'Pending', 'Failed'],
    default: 'Completed'
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
