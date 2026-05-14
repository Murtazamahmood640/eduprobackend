const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('../src/models/Course');

async function findAsset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const target = 'ikqcvwpshrrovkmlm4pj';
    const courses = await Course.find({ 
      $or: [
        { "outline.pdfUrl": { $regex: target } },
        { "outline.videoUrl": { $regex: target } }
      ]
    });
    
    courses.forEach(c => {
      console.log(`Course: ${c.title}`);
      c.outline.forEach(l => {
        if (l.pdfUrl?.includes(target) || l.videoUrl?.includes(target)) {
          console.log(`  Lesson: ${l.title}`);
          console.log(`    PDF: ${l.pdfUrl}`);
          console.log(`    Video: ${l.videoUrl}`);
        }
      });
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findAsset();
