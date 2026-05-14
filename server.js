const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Polyfills for pdf-parse (pdfjs-dist) in Node.js/Vercel environments
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {};
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}

const connectDB = require('./src/config/db');

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
  'https://eduproweb.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://192.168.0.141:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('/(.*)', cors(corsOptions)); // Handle preflight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode}`);
  });
  next();
});

// Connect to MongoDB
connectDB();

// Import routes
const uploadRoutes = require('./src/routes/uploadRoutes');
const userRoutes = require('./src/routes/userRoutes');
const courseRoutes = require('./src/routes/courseRoutes');
const registrationRoutes = require('./src/routes/registrationRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authRoutes = require('./src/routes/authRoutes');
const teacherRoutes = require('./src/routes/teacherRoutes');
const quizRoutes = require('./src/routes/quizRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const facultyRoutes = require('./src/routes/facultyRoutes');
const certificateRoutes = require('./src/routes/certificateRoutes');

// Mount routes
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/certificates', certificateRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// 404 Handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
