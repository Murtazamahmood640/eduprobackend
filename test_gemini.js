require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.env.GEMINI_API_KEY;
if (!key) { console.log('NO KEY'); process.exit(0); }
console.log('Key present, length:', key.length);

const genAI = new GoogleGenerativeAI(key);
const models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-pro-latest'];

(async () => {
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m, generationConfig: { maxOutputTokens: 100, temperature: 0.2 } });
      const result = await model.generateContent('Reply with the single word: OK');
      const text = result.response?.text ? result.response.text() : '(no text())';
      console.log(`MODEL ${m}: OK => ${JSON.stringify(text).slice(0, 60)}`);
    } catch (e) {
      const msg = (e.message || String(e)).slice(0, 140);
      console.log(`MODEL ${m}: FAIL => ${msg}`);
    }
  }
})();
