const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Registration = require('../models/Registration');

/**
 * @route   GET /api/teacher/stats
 * @desc    Get dashboard stats for a teacher
 * @access  Private (Teacher only)
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ message: 'User profile not found. Please complete signup.' });
    const teacherId = req.dbUser._id;

    // Get all courses by this teacher
    const courses = await Course.find({ instructor: teacherId });
    const courseIds = courses.map(c => c._id);

    // Get all registrations for these courses
    const registrations = await Registration.find({ course: { $in: courseIds } });

    // Calculate stats
    const totalStudents = new Set(registrations.map(r => r.student.toString())).size;
    const activeCourses = courses.length;
    const totalRevenue = registrations.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

    res.json({
      totalStudents,
      activeCourses,
      totalRevenue: `PKR ${totalRevenue.toLocaleString()}`,
      avgRating: "5.0 ★" // Placeholder until ratings are implemented
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/teacher/courses
 * @desc    Get courses managed by the teacher
 * @access  Private
 */
router.get('/courses', verifyToken, async (req, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ message: 'User profile not found. Please complete signup.' });
    const teacherId = req.dbUser._id;
    const courses = await Course.find({ instructor: teacherId }).lean();
    
    // For each course, get enrollment count
    const coursesWithStats = await Promise.all(courses.map(async (course) => {
      const enrollments = await Registration.countDocuments({ course: course._id });
      return {
        ...course,
        students: enrollments,
        revenue: `PKR ${(enrollments * course.price).toLocaleString()}`,
        status: course.status || 'Pending'
      };
    }));

    res.json(coursesWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/teacher/courses/:id
 * @desc    Get detailed management data for a single course
 * @access  Private
 */
router.get('/courses/:id', verifyToken, async (req, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ message: 'User profile not found. Please complete signup.' });
    const teacherId = req.dbUser._id;
    const course = await Course.findOne({ _id: req.params.id, instructor: teacherId }).lean();
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found in your portfolio' });
    }

    const enrollments = await Registration.countDocuments({ course: course._id });
    
    res.json({
      ...course,
      studentsCount: enrollments,
      revenue: enrollments * course.price
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/teacher/profile
 * @desc    Get teacher profile
 * @access  Private
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.dbUser._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/teacher/profile
 * @desc    Update teacher profile
 * @access  Private
 */
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { 
      name, bio, specialization, experience, introVideo, profilePicture,
      hourlyRate, availableDays, qualification, phoneNumber,
      city, gender, language, linkedin, youtube, github, portfolio, education, workHistory
    } = req.body;
    
    const user = await User.findById(req.dbUser._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name || user.name;
    user.bio = bio || user.bio;
    user.specialization = specialization || user.specialization;
    user.experience = experience || user.experience;
    user.introVideo = introVideo || user.introVideo;
    user.profilePicture = profilePicture || user.profilePicture;
    user.hourlyRate = hourlyRate || user.hourlyRate;
    user.availableDays = availableDays || user.availableDays;
    user.qualification = qualification || user.qualification;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.city = city || user.city;
    user.gender = gender || user.gender;
    user.language = language || user.language;
    user.linkedin = linkedin || user.linkedin;
    user.youtube = youtube || user.youtube;
    user.github = github || user.github;
    user.portfolio = portfolio || user.portfolio;
    user.education = education || user.education;
    user.workHistory = workHistory || user.workHistory;

    // Logic to determine if profile is complete
    // Required: bio, specialization, experience, introVideo, profilePicture
    if (user.bio && user.specialization && user.experience && user.introVideo && user.profilePicture) {
      user.isProfileComplete = true;
    } else {
      user.isProfileComplete = false;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students enrolled in teacher's courses
router.get('/students', verifyToken, async (req, res) => {
  try {
    // 1. Get all courses by this teacher
    const courses = await Course.find({ instructor: req.dbUser._id });
    const courseIds = courses.map(c => c._id);

    // 2. Find all registrations for these courses
    const registrations = await Registration.find({ course: { $in: courseIds } })
      .populate('student', 'name email profilePicture role userId');

    // 3. Extract unique students
    const studentMap = new Map();
    registrations.forEach(reg => {
      if (reg.student && !studentMap.has(reg.student._id.toString())) {
        studentMap.set(reg.student._id.toString(), {
          ...reg.student._doc,
          progress: reg.progress,
          courseTitle: courses.find(c => c._id.toString() === reg.course.toString())?.title,
          status: reg.status
        });
      }
    });

    res.json(Array.from(studentMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
