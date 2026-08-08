require('dotenv').config();
const mongoose = require('mongoose');
const Certificate = require('./src/models/Certificate');
const User = require('./src/models/User');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Registration = require('./src/models/Registration');
    const user = await User.findById('6a4407de70595e49a92f5b7f');
    const registrations = await Registration.find({ student: user._id });
    const courseIds = registrations.map(r => r.course);
    
    const activeModules = registrations.filter(r => r.status === 'active').length;
    const completedModules = registrations.filter(r => r.status === 'completed').length;
    
    // Count actual assessments
    const [quizCount, assignmentCount] = await Promise.all([
      require('./src/models/Quiz').countDocuments({ course: { $in: courseIds } }),
      require('./src/models/Assignment').countDocuments({ course: { $in: courseIds } })
    ]);
    
    // Average progress
    const avgProgress = registrations.length > 0
      ? Math.round(registrations.reduce((acc, curr) => acc + curr.progress, 0) / registrations.length)
      : 0;

    // Count actual certificates
    const credentialsEarned = await Certificate.countDocuments({ student: user._id });

    console.log({
      activeModules,
      completedModules,
      overallMastery: avgProgress,
      examsPending: quizCount + assignmentCount,
      credentialsEarned
    });
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
test();
