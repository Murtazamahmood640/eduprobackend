const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth');
const Result = require('../models/Result');
const User = require('../models/User');
const Course = require('../models/Course');

// Helper: calculate grade from score
function calculateGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'F';
}

/**
 * GET /api/results
 * Get all results (Admin only)
 */
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find()
      .populate('student', 'name email profilePicture')
      .populate('course', 'title category')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /api/results
 * Add a new result (Admin only)
 */
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { student, course, score, examDate, status } = req.body;
    if (!student || !course || score === undefined) {
      return res.status(400).json({ message: 'Student, course and score are required.' });
    }
    const grade = calculateGrade(Number(score));
    const result = await Result.create({
      student,
      course,
      score: Number(score),
      grade,
      examDate: examDate ? new Date(examDate) : new Date(),
      status: status || 'Draft'
    });
    const populated = await Result.findById(result._id)
      .populate('student', 'name email profilePicture')
      .populate('course', 'title category');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /api/results/:id
 * Update/publish a result (Admin only)
 */
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { score, examDate, status } = req.body;
    const update = {};
    if (score !== undefined) {
      update.score = Number(score);
      update.grade = calculateGrade(Number(score));
    }
    if (examDate) update.examDate = new Date(examDate);
    if (status) update.status = status;

    const result = await Result.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate('student', 'name email profilePicture')
      .populate('course', 'title category');
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * DELETE /api/results/:id
 * Delete a result (Admin only)
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.json({ message: 'Result deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
