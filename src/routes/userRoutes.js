const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const { generateUserId } = require('../utils/generateUserId');

// Get current user profile
// Get student dashboard stats
router.get('/student-stats', verifyToken, async (req, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ message: 'User profile not found.' });
    const registrations = await Registration.find({ student: req.dbUser._id });
    const courseIds = registrations.map(r => r.course);
    
    const activeModules = registrations.filter(r => r.status === 'active').length;
    const completedModules = registrations.filter(r => r.status === 'completed').length;
    
    // Count actual assessments
    const [quizCount, assignmentCount] = await Promise.all([
      Quiz.countDocuments({ course: { $in: courseIds } }),
      Assignment.countDocuments({ course: { $in: courseIds } })
    ]);
    
    // Average progress
    const avgProgress = registrations.length > 0 
      ? Math.round(registrations.reduce((acc, curr) => acc + curr.progress, 0) / registrations.length)
      : 0;

    res.json({
      activeModules,
      completedModules,
      overallMastery: avgProgress,
      examsPending: quizCount + assignmentCount,
      credentialsEarned: completedModules
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update or create profile (called on first login via Firebase)
router.post('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, profilePicture, role } = req.body;
    console.log(`[Profile] Request for UID: ${req.user.uid}, Role: ${role}, Name: ${name}`);
    let user = await User.findOne({ firebaseUid: req.user.uid });
    
    // If user not found by UID, try finding by email to link accounts
    if (!user && (email || req.user.email)) {
      user = await User.findOne({ email: email || req.user.email });
      if (user) {
        console.log(`[Profile] Linking existing user ${user.email} with UID: ${req.user.uid}`);
        user.firebaseUid = req.user.uid;
        user.name = name || user.name;
        user.profilePicture = profilePicture || user.profilePicture;
        await user.save();
      }
    }

    if (user) {
      // Update existing user
      user.name = name || user.name;
      user.profilePicture = profilePicture || user.profilePicture;
      await user.save();
    } else {
      // Create new user
      console.log(`[Profile] Creating new user for UID: ${req.user.uid}, Email: ${email || req.user.email}`);
      const safeRole = role === 'admin' ? 'student' : (role || 'student'); 
      const userId = await generateUserId(safeRole);
      user = await User.create({
        userId,
        firebaseUid: req.user.uid,
        email: email || req.user.email,
        name: name || 'New User',
        profilePicture,
        role: safeRole
      });
      console.log(`[Profile] Successfully created user: ${user._id} (${user.userId})`);
    }

    res.json(user);
  } catch (error) {
    console.error('Profile Creation/Update Error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `User with this ${field} already exists`,
        field: field 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Granular profile update
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, bio, phoneNumber, city, language, gender, profilePicture } = req.body;
    const user = await User.findById(req.dbUser._id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (city !== undefined) user.city = city;
    if (language !== undefined) user.language = language;
    if (gender !== undefined) user.gender = gender;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();
    res.json({ message: 'Profile synchronized successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
