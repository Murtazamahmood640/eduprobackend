const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

/**
 * @route   POST /api/assignments
 * @desc    Create a new assignment
 * @access  Private (Teacher)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('📝 Creating assignment with body:', req.body);
    const assignment = await Assignment.create(req.body);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('❌ Assignment Creation Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/assignments/course/:courseId
 * @desc    Get all assignments for a course
 * @access  Public
 */
router.get('/course/:courseId', verifyToken, async (req, res) => {
  try {
    const query = { course: req.params.courseId };
    
    // Students only see approved assignments
    if (req.dbUser.role === 'student') {
      query.status = 'Approved';
    }
    
    const assignments = await Assignment.find(query);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/assignments/submit
 * @desc    Submit an assignment
 * @access  Private (Student)
 */
router.post('/submit', verifyToken, async (req, res) => {
  try {
    const { assignmentId, fileUrl, fileName } = req.body;
    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.dbUser._id,
      fileUrl,
      fileName
    });
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/assignments/submissions/:assignmentId
 * @desc    Get all submissions for an assignment
 * @access  Private (Teacher)
 */
router.get('/submissions/:assignmentId', verifyToken, async (req, res) => {
  try {
    const submissions = await Submission.find({ assignment: req.params.assignmentId })
      .populate('student', 'name email profilePicture');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PATCH /api/assignments/grade/:submissionId
 * @desc    Grade a submission
 * @access  Private (Teacher)
 */
router.patch('/grade/:submissionId', verifyToken, async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.submissionId,
      { marks, feedback, status: 'graded' },
      { new: true }
    );
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
