const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    
    console.log('⏳ Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    const host = conn.connection.host || 'unknown host';
    console.log(`✅ MongoDB Connected: ${host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('⚠️ Server will continue to run, but database operations will fail.');
  }
};

module.exports = connectDB;
