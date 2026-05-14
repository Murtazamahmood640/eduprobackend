const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Certificate = require('../models/Certificate');
const crypto = require('crypto');

const Registration = require('../models/Registration');

/**
 * @route   GET /api/quizzes/my
 * @desc    Get all quizzes for courses the student is enrolled in
 * @access  Private
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const registrations = await Registration.find({ student: req.dbUser._id });
    const courseIds = registrations.map(r => r.course);
    
    const quizzes = await Quiz.find({ 
      course: { $in: courseIds },
      status: 'Approved' 
    }).populate('course', 'title');
    
    // Also fetch results for these quizzes to show progress/score
    const results = await QuizResult.find({ student: req.dbUser._id, quiz: { $in: quizzes.map(q => q._id) } });
    
    const quizzesWithStatus = quizzes.map(quiz => {
      const result = results.find(r => r.quiz.toString() === quiz._id.toString());
      return {
        ...quiz.toObject(),
        status: result ? (result.passed ? 'Passed' : 'Failed') : 'Not Started',
        score: result ? result.score : null
      };
    });

    res.json(quizzesWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { course, title, questions, duration, passingScore } = req.body;
    
    const quiz = await Quiz.create({
      course,
      title,
      questions,
      duration: parseInt(duration) || 15,
      passingScore: parseInt(passingScore) || 60
    });

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/quizzes/:id
 * @desc    Get a quiz by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('course', 'title');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/quizzes/course/:courseId
 * @desc    Get all quizzes for a course
 * @access  Public
 */
router.get('/course/:courseId', verifyToken, async (req, res) => {
  try {
    const query = { course: req.params.courseId };
    
    // Students only see approved quizzes
    if (req.dbUser.role === 'student') {
      query.status = 'Approved';
    }
    
    const quizzes = await Quiz.find(query);
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/quizzes/:id/submit
 * @desc    Submit quiz results and check for certification
 */
router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const { answers, score } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const passed = score >= (quiz.passingScore || 60);

    const result = await QuizResult.create({
      student: req.dbUser._id,
      quiz: quiz._id,
      course: quiz.course,
      score,
      passed,
      answers
    });

    // Automated Certification Check
    if (passed) {
      // Check if all quizzes for this course are passed
      const allQuizzes = await Quiz.find({ course: quiz.course });
      const passedResults = await QuizResult.find({ 
        student: req.dbUser._id, 
        course: quiz.course, 
        passed: true 
      });

      // Simple logic: if they passed at least one quiz for this course (or you can check for all)
      // For now, let's say if they pass THIS quiz, they get the certificate for demo purposes
      // or if you want strict: if (passedResults.length >= allQuizzes.length)
      
      const existingCert = await Certificate.findOne({ student: req.dbUser._id, course: quiz.course });
      if (!existingCert) {
        await Certificate.create({
          student: req.dbUser._id,
          course: quiz.course,
          certificateId: `CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          issueDate: new Date(),
          grade: score >= 90 ? 'Elite' : 'Distinction'
        });
      }
    }

    res.json({ result, passed });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
