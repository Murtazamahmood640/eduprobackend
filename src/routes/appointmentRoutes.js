const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const { verifyToken } = require('../middlewares/auth');

// Helper to generate a Jitsi meeting link
const generateMeetingLink = () => {
  const roomId = `EduPro-${crypto.randomBytes(6).toString('hex')}`;
  return `https://meet.jit.si/${roomId}#config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
};

// Get appointments for current teacher (instructor)
router.get('/teacher', verifyToken, async (req, res) => {
  try {
    const appointments = await Appointment.find({ instructor: req.dbUser._id })
      .populate('student', 'name email profilePicture')
      .populate('course', 'title')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get appointments for current student
router.get('/student', verifyToken, async (req, res) => {
  try {
    const appointments = await Appointment.find({ student: req.dbUser._id })
      .populate('instructor', 'name email profilePicture specialization')
      .populate('course', 'title')
      .sort({ date: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Student requests an appointment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { instructorId, courseId, topic, date, duration, notes } = req.body;
    const appointment = new Appointment({
      student: req.dbUser._id,
      instructor: instructorId,
      course: courseId,
      topic,
      date: new Date(date),
      duration: duration || 60,
      notes
    });
    await appointment.save();
    await appointment.populate('instructor', 'name email');
    const savedAppointment = await appointment.save();

    // Notify Teacher
    await Notification.create({
      recipient: instructorId,
      title: 'New Appointment Request',
      message: `A student has requested a session for ${req.dbUser.name}.`,
      type: 'info',
      link: '/teacher/appointments'
    });

    res.status(201).json(savedAppointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Teacher updates appointment status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    let { meetingLink } = req.body;

    // Auto-generate meeting link if confirming and no link provided
    if (status === 'confirmed' && !meetingLink) {
      meetingLink = generateMeetingLink();
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, instructor: req.dbUser._id },
      { status, ...(meetingLink && { meetingLink }) },
      { new: true }
    ).populate('student', 'name email profilePicture')
     .populate('course', 'title');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    // Notify Student
    await Notification.create({
      recipient: appointment.student._id,
      title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your session with ${req.dbUser.name} has been ${status}.`,
      type: status === 'confirmed' ? 'success' : 'warning',
      link: '/student/appointments'
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
