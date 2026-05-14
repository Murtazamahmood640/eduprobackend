const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Course = require('../src/models/Course');

async function checkCourses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const courses = await Course.find({}).limit(5);
    courses.forEach(c => {
      console.log(`Course: ${c.title}`);
      if (c.outline) {
        c.outline.forEach((l, i) => {
          console.log(`  Lesson ${i+1}: ${l.title}`);
          console.log(`    PDF: ${l.pdfUrl}`);
          console.log(`    Video: ${l.videoUrl}`);
        });
      }
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCourses();
