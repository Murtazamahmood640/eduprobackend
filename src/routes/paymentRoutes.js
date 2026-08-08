const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Course = require('../models/Course');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const { verifyToken } = require('../middlewares/auth');

/**
 * @route   POST /api/payments/checkout
 * @desc    Process course payment and automatically enroll student
 * @access  Private
 */
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { courseId, courseIds, paymentMethod, accountNumber, accountHolderName, couponCode, discountAmount } = req.body;

    const targetCourseIds = courseIds && Array.isArray(courseIds) && courseIds.length > 0
      ? courseIds
      : courseId ? [courseId] : [];

    if (targetCourseIds.length === 0) {
      return res.status(400).json({ message: 'Course ID is required for checkout.' });
    }

    // Find student
    const student = await User.findOne({ firebaseUid: req.user.uid });
    if (!student) {
      return res.status(404).json({ message: 'User profile not found. Please log in again.' });
    }

    const createdPayments = [];
    const createdRegistrations = [];

    // Process each target course
    for (const id of targetCourseIds) {
      const course = await Course.findById(id);
      if (!course) continue;

      // Check if student is already enrolled
      const existingRegistration = await Registration.findOne({
        student: student._id,
        course: course._id
      });

      if (existingRegistration) {
        continue;
      }

      // Generate Transaction ID
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const transactionId = `TXN-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      // Calculate Amount in GBP
      const origPrice = Number(course.price) || 0;
      const appliedDiscount = Number(discountAmount) || 0;
      const finalPrice = Math.max(0, origPrice - appliedDiscount);

      // Create Payment record
      const payment = await Payment.create({
        student: student._id,
        studentName: student.name || 'Student',
        studentEmail: student.email || req.user.email || '',
        course: course._id,
        courseTitle: course.title,
        originalAmount: origPrice,
        discountAmount: appliedDiscount,
        amount: finalPrice,
        couponCode: couponCode || '',
        currency: 'GBP',
        paymentMethod: paymentMethod || 'Credit / Debit Card',
        transactionId: transactionId,
        status: 'Completed'
      });

      // Create Registration record (enroll student)
      const registration = await Registration.create({
        student: student._id,
        course: course._id,
        status: 'active',
        progress: 0
      });

      createdPayments.push(payment);
      createdRegistrations.push(registration);

      console.log(`💳 [PAYMENT SUCCESS] ${student.name} paid £${finalPrice} (Orig £${origPrice}) for "${course.title}" via ${paymentMethod} (${transactionId})`);
    }

    // Increment coupon usage if coupon used
    if (couponCode) {
      await Coupon.updateOne({ code: couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });
    }

    res.status(201).json({
      message: 'Payment completed successfully! You are now enrolled in the course.',
      payments: createdPayments,
      registrations: createdRegistrations
    });
  } catch (error) {
    console.error('❌ Checkout Payment Error:', error);
    res.status(500).json({ message: 'Payment processing failed.', error: error.message });
  }
});

/**
 * @route   GET /api/payments/all
 * @desc    Get all transactions for Admin Panel Payments page
 * @access  Private (Admin)
 */
router.get('/all', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('student', 'name email profilePicture')
      .populate('course', 'title price thumbnail category')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('❌ Fetch Payments Error:', error);
    res.status(500).json({ message: 'Failed to fetch payment records.', error: error.message });
  }
});

module.exports = router;
