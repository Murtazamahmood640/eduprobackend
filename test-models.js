const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels in the simple SDK usually, 
    // but we can try to see what's available or just guess the standard ones.
    
    // Standard models as of late 2024/2025:
    // gemini-1.5-flash
    // gemini-1.5-pro
    // gemini-pro
    // gemini-1.0-pro
    
    console.log("Checking model availability...");
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("test");
            console.log(`✅ Model ${m} is AVAILABLE`);
        } catch (e) {
            console.log(`❌ Model ${m} FAILED: ${e.message}`);
        }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
