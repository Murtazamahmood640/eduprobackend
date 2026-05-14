const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * @route GET /api/faculty
 * @desc Get all verified faculty members
 */
router.get('/', async (req, res) => {
  try {
    const faculty = await User.find({ 
      role: 'teacher',
      profilePicture: { $exists: true, $ne: '' }
    }).select('name specialization bio profilePicture hourlyRate experience qualification availableDays introVideo');
    
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching faculty' });
  }
});

/**
 * @route GET /api/faculty/:id
 * @desc Get specific faculty details
 */
router.get('/:id', async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id)
      .select('name specialization bio profilePicture hourlyRate experience qualification availableDays introVideo linkedin youtube github portfolio education workHistory');
    
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching teacher details' });
  }
});

module.exports = router;
