const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// Built-in Seed Codes to ensure valid coupons exist out-of-the-box
const SEEDED_COUPONS = [
  { code: 'OAKSIS10', discountType: 'percentage', discountValue: 10, codeType: 'coupon', description: '10% Discount on all masterclasses' },
  { code: 'PRO25', discountType: 'percentage', discountValue: 25, codeType: 'coupon', description: '25% Special Academy Discount' },
  { code: 'EDU50', discountType: 'fixed', discountValue: 50, codeType: 'coupon', description: '£50 Flat Discount' },
  { code: 'REF-OAKSIS', discountType: 'fixed', discountValue: 30, codeType: 'referral', description: '£30 Student Referral Reward' },
  { code: 'FRIEND20', discountType: 'percentage', discountValue: 20, codeType: 'referral', description: '20% Friend Referral Bonus' },
];

// Helper to seed built-in codes if DB is empty
const seedCouponsIfEmpty = async () => {
  try {
    for (const c of SEEDED_COUPONS) {
      await Coupon.updateOne(
        { code: c.code },
        { $setOnInsert: c },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Coupon seed error:', err.message);
  }
};
seedCouponsIfEmpty();

/**
 * @route   POST /api/coupons/validate
 * @desc    Validate a coupon or referral code and calculate discount
 * @access  Public / Private
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, amount, expectedType } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Please enter a valid code.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

    if (!coupon) {
      return res.status(404).json({ message: `Invalid or expired ${expectedType || 'discount'} code.` });
    }

    if (expectedType && coupon.codeType !== expectedType) {
      return res.status(400).json({ 
        message: `This is a ${coupon.codeType} code. Please enter it in the ${coupon.codeType === 'coupon' ? 'Coupon Code' : 'Referral Code'} field.` 
      });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: 'This code limit has been reached.' });
    }

    const originalAmount = Number(amount) || 0;
    let discountAmount = 0;

    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((originalAmount * coupon.discountValue) / 100);
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(coupon.discountValue, originalAmount);
    }

    const finalAmount = Math.max(0, originalAmount - discountAmount);

    res.json({
      valid: true,
      code: coupon.code,
      codeType: coupon.codeType,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      originalAmount,
      finalAmount,
      description: coupon.description,
      message: `Success! ${coupon.codeType === 'referral' ? 'Referral' : 'Coupon'} code applied.`
    });
  } catch (error) {
    console.error('Coupon Validation Error:', error);
    res.status(500).json({ message: 'Error validating code.', error: error.message });
  }
});

/**
 * @route   GET /api/coupons
 * @desc    Get all active coupons/referral codes
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true }).select('code discountType discountValue codeType description');
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coupons' });
  }
});

module.exports = router;
