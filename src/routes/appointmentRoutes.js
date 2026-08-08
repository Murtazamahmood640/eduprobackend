const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const { verifyToken } = require('../middlewares/auth');

// Helper to generate a Jitsi meeting link
const generateMeetingLink = () => {
  const roomId = `OAKSIS-${crypto.randomBytes(6).toString('hex')}`;
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
    if (!req.dbUser) {
      return res.status(401).json({ message: 'User profile not found. Please complete your profile setup.' });
    }

    const { instructorId, courseId, topic, date, duration, notes } = req.body;

    console.log('Appointment request data:', {
      instructorId,
      courseId,
      topic,
      date,
      duration,
      studentId: req.dbUser._id
    });

    const appointment = new Appointment({
      student: req.dbUser._id,
      instructor: instructorId,
      course: courseId,
      topic,
      date: new Date(date),
      duration: duration || 60,
      notes
    });

    console.log('Saving appointment...');
    await appointment.save();
    console.log('Appointment saved successfully');

    await appointment.populate('instructor', 'name email');
    const savedAppointment = appointment;

    // Notify Teacher (optional - don't fail if notification fails)
    try {
      await Notification.create({
        recipient: instructorId,
        title: 'New Appointment Request',
        message: `A student has requested a session for ${req.dbUser.name}.`,
        type: 'info',
        link: '/teacher/appointments'
      });
      console.log('Notification created');
    } catch (notifError) {
      console.error('Notification creation failed (non-critical):', notifError);
      // Continue even if notification fails
    }

    res.status(201).json(savedAppointment);
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Teacher updates appointment status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    let { meetingLink } = req.body;

    console.log('Status update request:', { status, rejectionReason, meetingLink, id: req.params.id });

    // Auto-generate meeting link if confirming and no link provided
    if (status === 'confirmed' && !meetingLink) {
      meetingLink = generateMeetingLink();
    }

    // Build update using $set to ensure all fields are saved
    const setFields = { status };
    if (meetingLink) setFields.meetingLink = meetingLink;
    if ((status === 'cancelled' || status === 'completed') && rejectionReason) {
      setFields.rejectionReason = rejectionReason;
    }
    // Clear rejectionReason if not a cancellation
    if (status !== 'cancelled') {
      setFields.rejectionReason = '';
    }
    if (status === 'cancelled' && rejectionReason) {
      setFields.rejectionReason = rejectionReason;
    }

    console.log('Saving fields:', setFields);

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, instructor: req.dbUser._id },
      { $set: setFields },
      { new: true, runValidators: false }
    ).populate('student', 'name email profilePicture')
     .populate('course', 'title');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    console.log('Updated appointment rejectionReason:', appointment.rejectionReason);

    // Notify Student — include rejection reason if cancelled
    const notifMessage = status === 'cancelled' && rejectionReason
      ? `Your session with ${req.dbUser.name} was declined. Reason: ${rejectionReason}`
      : status === 'completed'
      ? `Your session with ${req.dbUser.name} has ended.`
      : `Your session with ${req.dbUser.name} has been ${status}.`;

    try {
      await Notification.create({
        recipient: appointment.student._id,
        title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: notifMessage,
        type: status === 'confirmed' ? 'success' : status === 'completed' ? 'info' : 'warning',
        link: '/student/appointments'
      });
    } catch (notifErr) {
      console.error('Notification failed (non-critical):', notifErr.message);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
