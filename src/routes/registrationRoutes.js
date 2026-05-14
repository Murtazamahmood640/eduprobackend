const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const { verifyToken } = require('../middlewares/auth');

// Enroll in a course
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ message: 'User profile not found. Please complete your profile setup first.' });
    }

    const { courseId } = req.body;
    
    // Check if already enrolled
    const existing = await Registration.findOne({ 
      student: req.dbUser._id, 
      course: courseId 
    });

    if (existing) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    const registration = await Registration.create({
      student: req.dbUser._id,
      course: courseId,
      status: 'active',
      progress: 0
    });

    res.status(201).json(registration);
  } catch (error) {
    console.error('Registration POST error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all registrations for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!req.dbUser) {
      return res.json([]); // Return empty array if profile not set up yet
    }

    const registrations = await Registration.find({ student: req.dbUser._id })
      .populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name profilePicture' }
      });
    res.json(registrations);
  } catch (error) {
    console.error('Registration GET error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
