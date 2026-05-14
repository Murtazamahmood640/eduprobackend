const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const cloudinary = require('../config/cloudinary');
const { verifyToken } = require('../middlewares/auth');

router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const isPdf = req.file.mimetype === 'application/pdf';
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto', 
      folder: 'edupro'
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Server error during upload', error: error.message });
  }
});

module.exports = router;
