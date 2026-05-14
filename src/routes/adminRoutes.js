const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const { verifyToken, isSuperAdmin, isAdmin } = require('../middlewares/auth');
const { generateUserId } = require('../utils/generateUserId');
const jwt = require('jsonwebtoken');

/**
 * POST /api/admin/login
 * ... (existing login route)
 */
router.post('/login', async (req, res) => {
  // ... (keep existing login logic)
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email, role: { $in: ['admin', 'superadmin', 'employee_admin'] } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      permissions: user.permissions
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/admins
 * List all admins (Super Admin only)
 */
router.get('/admins', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin', 'employee_admin'] } });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /api/admin/create-admin
 * Create a new admin (Super Admin only)
 */
router.post('/create-admin', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await generateUserId(role || 'admin');

    user = await User.create({
      userId,
      name,
      email,
      password: hashedPassword,
      role: role || 'employee_admin',
      permissions: permissions || [],
      isEmailVerified: true // Admins created by Super Admin are auto-verified
    });

    res.status(201).json({ message: 'Admin created successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /api/admin/admins/:id
 * Update admin permissions/role
 */
router.put('/admins/:id', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { role, permissions, isActive } = req.body;
    const admin = await User.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.role === 'superadmin' && req.dbUser.email !== admin.email) {
      return res.status(403).json({ message: 'Cannot modify another Super Admin' });
    }

    admin.role = role || admin.role;
    admin.permissions = permissions || admin.permissions;
    if (isActive !== undefined) admin.isActive = isActive;
    
    await admin.save();
    res.json({ message: 'Admin updated successfully', admin });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/stats
 * Get overall platform stats
 */
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' });
    const teacherCount = await User.countDocuments({ role: 'teacher' });
    const courseCount = await Course.countDocuments();
    
    // Sum of all course prices (simplified revenue model for now)
    const courses = await Course.find({}, 'price');
    const totalRevenue = courses.reduce((sum, c) => sum + (c.price || 0), 0);

    // Real active enrollments count from Registration model
    const Registration = require('../models/Registration');
    const activeEnrollments = await Registration.countDocuments();

    res.json({
      totalStudents: studentCount,
      totalTeachers: teacherCount,
      totalCourses: courseCount,
      totalRevenue: totalRevenue,
      activeEnrollments: activeEnrollments
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/students
 */
router.get('/students', verifyToken, isAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /api/admin/students
 */
router.post('/students', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'Student already exists' });

    const userId = await generateUserId('student');
    const hashedPassword = await bcrypt.hash(password || 'EduPro123!', 10);

    user = await User.create({
      userId,
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'student',
      isEmailVerified: true
    });

    res.status(201).json({ message: 'Student created successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PATCH /api/admin/students/:id
 */
router.patch('/students/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, phone, isActive } = req.body;
    const student = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'student' },
      { 
        ...(name && { name }),
        ...(phone && { phone }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    ).select('-password');

    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student manifest updated', student });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/teachers
 */
router.get('/teachers', verifyToken, isAdmin, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-password').lean().sort({ createdAt: -1 });
    
    // Calculate course count and get course titles for each teacher
    const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
      const Registration = require('../models/Registration');
      const courses = await Course.find({ instructor: teacher._id }, '_id title status');
      const courseIds = courses.map(c => c._id);
      const studentCount = await Registration.countDocuments({ course: { $in: courseIds } });
      
      return {
        ...teacher,
        courseCount: courses.length,
        courses: courses.map(c => ({ _id: c._id, title: c.title, status: c.status })),
        studentCount
      };
    }));

    res.json(teachersWithStats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/courses
 */
router.get('/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const courses = await Course.find(query).populate('instructor', 'name email').sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PATCH /api/admin/courses/:id/status
 * Approve or Reject a course
 */
router.patch('/courses/:id/status', verifyToken, isAdmin, async (req, res) => {
  console.log(`[Admin] Status Update Request: Course ${req.params.id} -> ${req.body.status} by ${req.dbUser.email}`);
  try {
    const { status, rejectionReason } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.status = status;
    if (status === 'Rejected') {
      course.rejectionReason = rejectionReason || 'No reason provided';
    } else {
      course.rejectionReason = undefined;
    }

    await course.save();

    if (status === 'Approved') {
      const Quiz = require('../models/Quiz');
      const Assignment = require('../models/Assignment');
      
      // Auto-approve associated content
      await Promise.all([
        Quiz.updateMany({ course: req.params.id }, { status: 'Approved' }),
        Assignment.updateMany({ course: req.params.id }, { status: 'Approved' })
      ]);
    }

    // Notify Teacher
    await Notification.create({
      recipient: course.instructor,
      title: `Course ${status}`,
      message: status === 'Approved' 
        ? `Congratulations! Your course "${course.title}" has been approved.`
        : `Your course "${course.title}" was rejected. Reason: ${rejectionReason}`,
      type: status === 'Approved' ? 'success' : 'error',
      link: '/teacher/courses'
    });

    res.json({ message: `Course ${status.toLowerCase()} successfully`, course });
  } catch (err) {
    console.error(`❌ [Admin] Status Update Error:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PATCH /api/admin/teachers/:id
 * Update teacher profile (Admin only)
 */
router.patch('/teachers/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, specialization, education, experience, socialLinks, isActive } = req.body;
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher' },
      { 
        ...(name && { name }),
        ...(specialization && { specialization }),
        ...(education && { education }),
        ...(experience && { experience }),
        ...(socialLinks && { socialLinks }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    ).select('-password');

    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ message: 'Teacher profile updated', teacher });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/quizzes
 */
router.get('/quizzes', verifyToken, isAdmin, async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const { status } = req.query;
    const query = status ? { status } : {};
    const quizzes = await Quiz.find(query).populate('course', 'title').sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PATCH /api/admin/quizzes/:id/status
 */
router.patch('/quizzes/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const Quiz = require('../models/Quiz');
    const { status, rejectionReason } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    quiz.status = status;
    if (status === 'Rejected') quiz.rejectionReason = rejectionReason;
    await quiz.save();

    res.json({ message: `Quiz ${status.toLowerCase()} successfully`, quiz });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /api/admin/assignments
 */
router.get('/assignments', verifyToken, isAdmin, async (req, res) => {
  try {
    const Assignment = require('../models/Assignment');
    const { status } = req.query;
    const query = status ? { status } : {};
    const assignments = await Assignment.find(query).populate('course', 'title').sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PATCH /api/admin/assignments/:id/status
 */
router.patch('/assignments/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const Assignment = require('../models/Assignment');
    const { status, rejectionReason } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    assignment.status = status;
    if (status === 'Rejected') assignment.rejectionReason = rejectionReason;
    await assignment.save();

    res.json({ message: `Assignment ${status.toLowerCase()} successfully`, assignment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
