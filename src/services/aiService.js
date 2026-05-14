const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      console.log('✨ AI Intelligence: Gemini API Key detected. Initializing Multi-Model Failover...');
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // Primary model: gemini-flash-latest (Verified working for this key)
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        }
      });
    } else {
      console.warn('⚠️ AI Intelligence: GEMINI_API_KEY is missing from environment.');
    }
  }

  /**
   * Generate a quiz from text content
   */
  async generateQuizFromText(content, questionCount = 10) {
    if (!this.apiKey) return this._simulateQuiz(content, questionCount);

    console.log(`🔮 AIService: Architecting ${questionCount} questions from context (${content.length} chars)`);
    const prompt = `
      You are an elite academic professor. 
      TASK: ARCHITECT A PROFESSIONAL ${questionCount}-QUESTION ASSESSMENT.
      
      MATERIAL TO ANALYZE: "${content}"
      
      CRITICAL RULE: YOU MUST GENERATE EXACTLY ${questionCount} QUESTIONS. 
      FAILURE TO GENERATE EXACTLY ${questionCount} QUESTIONS IS UNACCEPTABLE.
      
      STRICT REQUIREMENTS:
      1. Generate EXACTLY ${questionCount} Multiple Choice Questions (MCQs).
      2. Each question MUST be highly specific and derived DIRECTLY from the MATERIAL provided above.
      3. DO NOT use generic placeholders like "Question regarding the lecture".
      4. Each question MUST have exactly 4 distinct options (A, B, C, D).
      5. The distractors (wrong answers) must be plausible but clearly incorrect based on the material.
      6. RETURN ONLY A PURE JSON ARRAY. NO MARKDOWN. NO INTRO TEXT.
      
      JSON SCHEMA (Array must contain EXACTLY ${questionCount} items):
      [
        {
          "question": "Specific question about a concept in the material...",
          "options": ["Correct Answer", "Plausible Distractor 1", "Plausible Distractor 2", "Plausible Distractor 3"],
          "correctAnswer": 0
        }
      ]
    `;

    try {
      let result;
      try {
        this.model = this.genAI.getGenerativeModel({ 
          model: "gemini-flash-latest",
          generationConfig: { maxOutputTokens: 4096 }
        });
        result = await this.model.generateContent(prompt);
      } catch (firstErr) {
        console.log("🔄 Flash model failed. Falling back to Pro-Latest...");
        const backupModel = this.genAI.getGenerativeModel({ model: "gemini-pro-latest" });
        result = await backupModel.generateContent(prompt);
      }

      const response = await result.response;
      const text = response.text();
      
      // Robust extraction: finding the first '[' and last ']'
      const startIdx = text.indexOf('[');
      const endIdx = text.lastIndexOf(']');
      
      if (startIdx === -1 || endIdx === -1) {
        console.error("AI response did not contain a JSON array:", text);
        throw new Error("Invalid AI response format.");
      }
      
      const jsonStr = text.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed.slice(0, questionCount) : parsed;
    } catch (error) {
      console.error("❌ AI Quiz Generation Error:", error);
      // Propagate the error so the frontend knows the AI service is actually failing (e.g. 503 Busy)
      throw error;
    }
  }

  /**
   * Suggest an outline for a course module
   */
  async suggestModuleOutline(title, description) {
    if (!this.apiKey) return this._simulateOutline(title);

    const prompt = `
      Create a detailed module outline for a course titled "${title}". 
      Description: "${description}"
      Return a JSON array of exactly 4-6 section titles. Return ONLY the JSON array.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this._simulateOutline(title);
    } catch (error) {
      console.error("❌ AI Outline Suggestion Error:", error);
      return this._simulateOutline(title);
    }
  }

  /**
   * General Chatbot Response
   */
  async chatResponse(message, history = []) {
    if (!this.apiKey) return "I'm currently in offline mode, but I can help you with basic platform navigation! Try asking about courses or pricing.";

    const platformContext = `
      You are the EduPro Academy Virtual Assistant. Your goal is to help users with questions about our platform, courses, and educational services.
      
      PLATFORM CONTEXT:
      - Academy: EduPro Academy (Premium Education Platform).
      - Key Courses: O-Level Mathematics, Web Development, German Language, Data Science, UI/UX Design.
      - Core Features: Professional video lectures, interactive quizzes, graded assignments, progress tracking, and verified certificates.
      - Business Model: Courses starting at $29, Premium Bundle at $99/year.
      
      BEHAVIOR RULES:
      1. ALWAYS respond to greetings (Hi, Hey, Hello) warmly and introduce yourself as the EduPro Assistant.
      2. If a user asks a question COMPLETELY UNRELATED to EduPro Academy, learning, or education (e.g., weather, politics, jokes), respond with: "I'm specialized in helping you navigate EduPro Academy! Please ask me something related to our courses, features, or platform services."
      3. Keep answers concise, elite, and professional.
      
      USER MESSAGE: "${message}"
    `;

    try {
      const chat = this.model.startChat({
        history: history.map(m => ({
          role: m.sender === 'bot' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage(platformContext);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("❌ AI Chat Error:", error);
      return "I'm having a bit of trouble connecting to my central intelligence. Please try again in a moment.";
    }
  }

  _simulateQuiz(content, count) {
    console.log("⚠️ [DEBUG-V2] AI Simulation Triggered. Count:", count);
    return Array.from({ length: count }).map((_, i) => ({
      question: `Assessment Question ${i + 1}: Analyze the core principles of the provided academic material.`,
      options: [
        "Primary analytical conclusion derived from data",
        "Secondary supporting evidence and frameworks",
        "Theoretical application of the core concepts",
        "Empirical observation and case study analysis"
      ],
      correctAnswer: 0
    }));
  }

  _simulateOutline(title) {
    return [`Introduction to ${title}`, `Core Pillars of ${title}`, `Practical Applications`, `${title} Masterclass` ];
  }
}

module.exports = new AIService();
