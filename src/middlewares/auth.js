const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Firebase Admin Initialization
try {
  if (!admin.apps.length) {
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('📦 Using Firebase Service Account from environment variable');
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(serviceAccount);
      } catch (parseErr) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT env var:', parseErr.message);
        throw parseErr;
      }
    } else if (fs.existsSync(serviceAccountPath)) {
      console.log('📄 Using Firebase Service Account from local file');
      credential = admin.credential.cert(serviceAccountPath);
    }

    if (credential) {
      admin.initializeApp({ credential });
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('⚠️  Firebase Admin initialized with applicationDefault (No service account found)');
    }
  }
} catch (e) {
  console.log("❌ Firebase admin initialization error: ", e.message);
}

const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth Error: No token provided');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Try Firebase First
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Find user in MongoDB and attach to request
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    req.user = decodedToken;
    req.dbUser = user; 
    
    if (!user) {
      console.warn(`⚠️  Auth Warning: Firebase user ${decodedToken.uid} (${decodedToken.email}) not found in MongoDB`);
    }
    
    return next();
  } catch (error) {
    // If Firebase fails, try custom JWT (for Admins)
    try {
      const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decodedAdmin.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: User not found' });
      }

      req.user = decodedAdmin;
      req.dbUser = user;
      return next();
    } catch (jwtError) {
      console.error('❌ Auth Error: Invalid token:', jwtError.message);
      return res.status(401).json({ message: 'Unauthorized: Invalid token', error: jwtError.message });
    }
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.dbUser && req.dbUser.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Super Admin only' });
  }
};

const isAdmin = (req, res, next) => {
  const adminRoles = ['admin', 'superadmin', 'employee_admin'];
  if (req.dbUser && adminRoles.includes(req.dbUser.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin only' });
  }
};

module.exports = { verifyToken, isSuperAdmin, isAdmin };
