const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const aiService = require('../services/aiService');

/**
 * @route   POST /api/ai/generate-quiz
 * @desc    Generate a quiz from text or description
 */
router.post('/generate-quiz', verifyToken, async (req, res) => {
  try {
    const { content, count } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required for AI analysis.' });

    const qCount = parseInt(count) || 10;
    console.log(`🤖 AI: Generating ${qCount} questions for content length: ${content.length}`);

    const quiz = await aiService.generateQuizFromText(content, qCount);
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'AI Intelligence failed to respond.', error: error.message });
  }
});

/**
 * @route   POST /api/ai/suggest-outline
 * @desc    Suggest course module outline
 */
router.post('/suggest-outline', verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    const outline = await aiService.suggestModuleOutline(title, description);
    res.json(outline);
  } catch (error) {
    res.status(500).json({ message: 'AI Intelligence failed to respond.', error: error.message });
  }
});

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with EduPro Assistant
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });

    const response = await aiService.chatResponse(message, history || []);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ message: 'AI Intelligence failed to respond.', error: error.message });
  }
});

const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const upload = require('../middlewares/upload');

/**
 * @route   POST /api/ai/extract-text
 * @desc    Extract text from PDF or DOCX for AI analysis
 */
router.post('/extract-text', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    let text = '';
    const buffer = req.file.buffer;
    const mimetype = req.file.mimetype;
    const filename = req.file.originalname;

    console.log(`📑 Processing ${filename} (${mimetype}, ${buffer.length} bytes)`);

    if (mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      try {
        console.log("🛠️ Attempting PDF Parse for:", filename);
        const data = await pdf(buffer);
        text = data.text;
        console.log(`✅ Extracted ${text.length} characters from PDF.`);
      } catch (pdfErr) {
        console.error('❌ PDF Parse Error:', pdfErr.message);
        // Fallback to simpler extraction or specific error
        if (pdfErr.message.includes('password')) {
          throw new Error('This PDF is password protected and cannot be read.');
        }
        throw new Error('PDF structure is unreadable. Please try a different PDF or copy-paste text.');
      }
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      mimetype === 'application/msword' || 
      filename.toLowerCase().endsWith('.docx') || 
      filename.toLowerCase().endsWith('.doc')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: buffer });
        text = result.value;
      } catch (wordErr) {
        console.error('❌ Word Parse Error:', wordErr);
        throw new Error('Word document structure is unreadable.');
      }
    } else if (mimetype === 'text/plain' || filename.toLowerCase().endsWith('.txt') || filename.toLowerCase().endsWith('.md')) {
      text = buffer.toString('utf-8');
    } else {
      console.warn('⚠️ Unsupported Mimetype:', mimetype, 'Filename:', filename);
      return res.status(400).json({ message: `Unsupported file type: ${filename.split('.').pop()?.toUpperCase()}` });
    }

    if (!text || text.trim().length < 5) {
      throw new Error('Document seems to be empty or unreadable.');
    }

    res.json({ text: text.trim().substring(0, 8000) }); // Increased limit to 8k
  } catch (error) {
    console.error('❌ Extraction Service Error:', error);
    res.status(500).json({ message: error.message || 'Failed to extract text from document.' });
  }
});

module.exports = router;
