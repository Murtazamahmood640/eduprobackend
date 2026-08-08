const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const Certificate = require('../models/Certificate');
const Registration = require('../models/Registration');
const crypto = require('crypto');

/**
 * @route   POST /api/certificates/generate
 * @desc    Generate a certificate for a completed course
 * @access  Private (Student)
 */
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    
    // 1. Verify enrollment and progress
    const registration = await Registration.findOne({ 
      student: req.dbUser._id, 
      course: courseId 
    }).populate('course');

    if (!registration) {
      return res.status(404).json({ message: 'Enrollment record not found.' });
    }

    if (registration.progress < 100) {
      return res.status(403).json({ 
        message: 'Course Incomplete', 
        error: `You must reach 100% mastery to unlock your credentials. Current: ${registration.progress}%` 
      });
    }

    // 2. Check if certificate already exists
    const existingCert = await Certificate.findOne({ 
      student: req.dbUser._id, 
      course: courseId 
    });

    if (existingCert) {
      return res.json(existingCert);
    }

    // 3. Generate Unique Certificate ID
    const certId = `EDU-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${new Date().getFullYear()}`;

    // 4. Create Certificate
    const certificate = await Certificate.create({
      student: req.dbUser._id,
      course: courseId,
      certificateId: certId,
      issueDate: new Date(),
      grade: 'Distinction' // Default for elite platform
    });

    res.status(201).json(certificate);
  } catch (error) {
    res.status(500).json({ message: 'Credential generation failed.', error: error.message });
  }
});

/**
 * @route   GET /api/certificates/my
 * @desc    Get all certificates for the current user
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.dbUser._id })
      .populate('course', 'title thumbnail category');
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch credentials.', error: error.message });
  }
});

/**
 * @route   GET /api/certificates/all
 * @desc    Get all certificates (Admin Only)
 */
router.get('/all', verifyToken, async (req, res) => {
  try {
    const { isAdmin } = require('../middlewares/auth');
    // We could use isAdmin middleware here but we already have verifyToken
    if (req.dbUser.role !== 'admin' && req.dbUser.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const certificates = await Certificate.find()
      .populate('student', 'name email')
      .populate('course', 'title')
      .sort({ issueDate: -1 });
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch global credentials.', error: error.message });
  }
});

/**
 * @route   POST /api/certificates/issue-manual
 * @desc    Manually issue a certificate (Admin Only)
 */
router.post('/issue-manual', verifyToken, async (req, res) => {
  try {
    if (req.dbUser.role !== 'admin' && req.dbUser.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { studentId, courseId, grade } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ message: 'studentId and courseId are required.' });
    }

    // Check if already exists
    const existing = await Certificate.findOne({ student: studentId, course: courseId });
    if (existing) {
      return res.json(existing);
    }

    const certId = `EDU-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${new Date().getFullYear()}`;
    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      certificateId: certId,
      issueDate: new Date(),
      grade: grade || 'Distinction'
    });

    const populated = await Certificate.findById(certificate._id)
      .populate('student', 'name email')
      .populate('course', 'title');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Manual issuance failed.', error: error.message });
  }
});

module.exports = router;
