const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { verifyToken } = require('../middlewares/auth');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ status: 'Approved' }).populate('instructor', 'name profilePicture');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name profilePicture');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new course
router.post('/', verifyToken, async (req, res) => {
  try {
    // Check if teacher profile is complete
    if (req.dbUser.role === 'teacher' && !req.dbUser.isProfileComplete) {
      return res.status(403).json({ 
        message: 'Profile Incomplete', 
        error: 'You must complete your faculty profile and upload an intro video before creating courses.' 
      });
    }

    const courseData = {
      ...req.body,
      instructor: req.dbUser._id,
      status: 'Pending' 
    };
    const newCourse = await Course.create(courseData);
    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Course Creation Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a course
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, instructor: req.dbUser._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }
    
    Object.assign(course, req.body);
    await course.save();
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
