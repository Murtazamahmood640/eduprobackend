require('dotenv').config();
const aiService = require('./src/services/aiService');

(async () => {
  try {
    console.log('apiKey present:', !!aiService.apiKey);
    const quiz = await aiService.generateQuizFromText('This is a course about graphic design fundamentals: color theory, typography, layout composition, and visual hierarchy.', 10);
    console.log('RESULT type:', Array.isArray(quiz) ? 'array' : typeof quiz, 'length:', Array.isArray(quiz) ? quiz.length : 'n/a');
    console.log('SAMPLE:', JSON.stringify(Array.isArray(quiz) ? quiz[0] : quiz, null, 2).slice(0, 500));
  } catch (e) {
    console.log('THREW ERROR:', (e.message || String(e)).slice(0, 300));
  }
})();
