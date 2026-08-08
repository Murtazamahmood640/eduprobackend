const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  static GEMINI_MODEL = "gemini-flash-latest";

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      console.log('✨ AI Intelligence: Gemini API Key detected. Initializing Multi-Model Failover...');
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // Only use models verified to work with this API key.
      // gemini-pro-latest / gemini-2.x / gemini-1.5.x return 403/404 for this key.
      this.model = this.genAI.getGenerativeModel({ 
        model: AIService.GEMINI_MODEL,
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
          model: AIService.GEMINI_MODEL,
          generationConfig: { maxOutputTokens: 4096 }
        });
        result = await this.model.generateContent(prompt);
      } catch (firstErr) {
        // Transient failures (rate limit / 503) — retry with the same verified model.
        console.log(`🔄 Gemini transient failure (${firstErr.message}). Retrying...`);
        await new Promise((r) => setTimeout(r, 1500));
        result = await this.model.generateContent(prompt);
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
   * Generate a complete course blueprint from a title
   */
  async generateCourseBlueprint(title) {
    if (!this.apiKey) return this._simulateBlueprint(title);

    const prompt = `
      You are an elite curriculum designer working for a premium SaaS LMS platform.
      TASK: Architect a complete, industry-standard course blueprint for the course titled "${title}".

      RETURN ONLY A VALID JSON OBJECT. NO MARKDOWN, NO COMMENTARY, NO EXTRA TEXT.

      JSON SCHEMA (follow EXACTLY):
      {
        "modules": [
          {
            "title": "Module title",
            "description": "Two or three sentence description of the module",
            "lessons": [
              { "title": "Lecture title", "notes": "One or two sentence summary of what the lecture covers", "estimatedMinutes": 15 }
            ]
          }
        ],
        "learningOutcomes": ["5 to 6 concrete, measurable outcomes students will achieve"],
        "skills": ["5 to 6 specific skills students will master"],
        "resources": ["4 to 6 recommended books, tools, or resources"],
        "quiz": {
          "title": "Course assessment title",
          "questions": [
            { "question": "Question text", "options": ["correct option", "distractor", "distractor", "distractor"], "correctAnswer": 0, "explanation": "Why this answer is correct" }
          ]
        }
      }

      STRICT REQUIREMENTS:
      1. Generate between 4 and 6 modules.
      2. Every module MUST contain at least 3 lessons.
      3. Lesson titles must be professional and specific to "${title}".
      4. The quiz must contain at least 5 questions, each with exactly 4 options.
      5. All content must be in clear, professional English.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid AI response format.');
      }
      const parsed = JSON.parse(text.substring(startIdx, endIdx + 1));
      return this._normalizeBlueprint(parsed, title);
    } catch (error) {
      console.error("❌ AI Course Blueprint Generation Error:", error);
      return this._simulateBlueprint(title);
    }
  }

  _normalizeBlueprint(raw, title) {
    const modules = Array.isArray(raw.modules) && raw.modules.length > 0
      ? raw.modules.map((m) => ({
          title: String(m.title || 'Module').trim() || 'Module',
          description: String(m.description || '').trim(),
          lessons: Array.isArray(m.lessons) && m.lessons.length > 0
            ? m.lessons.map((l) => ({
                title: String(l.title || 'Lesson').trim() || 'Lesson',
                notes: String(l.notes || '').trim(),
                estimatedMinutes: parseInt(l.estimatedMinutes, 10) || 15,
              }))
            : [{ title: 'Lesson 1', notes: '', estimatedMinutes: 15 }],
        }))
      : [];

    return {
      modules: modules.length > 0 ? modules : this._simulateBlueprint(title).modules,
      learningOutcomes: Array.isArray(raw.learningOutcomes) && raw.learningOutcomes.length > 0
        ? raw.learningOutcomes.map(String)
        : [`Understand the core principles of ${title}`, `Apply practical techniques to real projects in ${title}`, `Build a professional portfolio in ${title}`, `Master industry-standard tools for ${title}`, `Evaluate and improve your work using expert feedback in ${title}`],
      skills: Array.isArray(raw.skills) && raw.skills.length > 0
        ? raw.skills.map(String)
        : [`Core concepts of ${title}`, `Hands-on workflow for ${title}`, `Problem solving in ${title}`, `Industry best practices for ${title}`, `Deliverables and presentation in ${title}`],
      resources: Array.isArray(raw.resources) && raw.resources.length > 0
        ? raw.resources.map(String)
        : [`Official documentation for ${title}`, `Recommended practice exercises`, `Community forums and study groups`, `Supplementary reading list`],
      quiz: raw.quiz && Array.isArray(raw.quiz.questions) && raw.quiz.questions.length > 0
        ? {
            title: String(raw.quiz.title || `${title} Final Assessment`),
            questions: raw.quiz.questions.slice(0, 12).map((q) => {
              const options = Array.isArray(q.options) ? q.options.map(String) : [];
              return {
                question: String(q.question || 'Question').trim(),
                options: options.length === 4 ? options : ['Correct option', 'Distractor A', 'Distractor B', 'Distractor C'],
                correctAnswer: parseInt(q.correctAnswer, 10) || 0,
                explanation: String(q.explanation || '').trim(),
              };
            }),
          }
        : this._simulateBlueprint(title).quiz,
    };
  }

  _simulateBlueprint(title) {
    const moduleTitles = [
      `Introduction to ${title}`,
      `Core Foundations of ${title}`,
      `Practical Skills in ${title}`,
      `Advanced Topics in ${title}`,
      `${title} Capstone Project`,
    ];
    const modules = moduleTitles.map((moduleTitle) => ({
      title: moduleTitle,
      description: `In this module you will build a strong, practical foundation in ${title} through guided lessons, demonstrations, and hands-on exercises.`,
      lessons: [
        {
          title: `${moduleTitle} — Overview & Objectives`,
          notes: `Understand the key goals and concepts covered in ${moduleTitle.toLowerCase()}.`,
          estimatedMinutes: 12,
        },
        {
          title: `${moduleTitle} — Step-by-Step Walkthrough`,
          notes: `Follow along with practical demonstrations of the core techniques and workflows.`,
          estimatedMinutes: 18,
        },
        {
          title: `${moduleTitle} — Practice & Assignment`,
          notes: `Apply what you have learned with a guided practice task to solidify your understanding.`,
          estimatedMinutes: 15,
        },
      ],
    }));

    return {
      modules,
      learningOutcomes: [
        `Understand the core principles of ${title}`,
        `Apply practical techniques to real projects in ${title}`,
        `Build a professional portfolio in ${title}`,
        `Master industry-standard tools for ${title}`,
        `Evaluate and improve your work using expert feedback in ${title}`,
      ],
      skills: [
        `Core concepts of ${title}`,
        `Hands-on workflow for ${title}`,
        `Problem solving in ${title}`,
        `Industry best practices for ${title}`,
        `Deliverables and presentation in ${title}`,
      ],
      resources: [
        `Official documentation for ${title}`,
        `Recommended practice exercises`,
        `Community forums and study groups`,
        `Supplementary reading list`,
      ],
      quiz: {
        title: `${title} Final Assessment`,
        questions: [
          {
            question: `What is the primary goal of the ${title} course?`,
            options: [
              `Master the core concepts and practical skills of ${title}`,
              `Memorize theory without practice`,
              `Skip foundational lessons`,
              `Only watch the videos`,
            ],
            correctAnswer: 0,
            explanation: `The course is designed to build both understanding and hands-on skill in ${title}.`,
          },
          {
            question: `Which lesson should you complete before the others?`,
            options: [
              `The module overview and objectives`,
              `The final capstone`,
              `The practice assignment only`,
              `Any lesson in any order`,
            ],
            correctAnswer: 0,
            explanation: `Each module begins with an overview that introduces the concepts used in later lessons.`,
          },
          {
            question: `How can you get the most out of this course?`,
            options: [
              `Practice the exercises and complete the assignments`,
              `Only read the lesson notes`,
              `Skip the quizzes`,
              `Never review the lessons`,
            ],
            correctAnswer: 0,
            explanation: `Active practice and assessment are essential for retaining new skills.`,
          },
          {
            question: `What should you do after finishing all modules?`,
            options: [
              `Complete the capstone project`,
              `Immediately stop learning`,
              `Delete your work`,
              `Ignore the final assessment`,
            ],
            correctAnswer: 0,
            explanation: `The capstone project consolidates everything you have learned into a real deliverable.`,
          },
          {
            question: `Which resource will help you go deeper into ${title}?`,
            options: [
              `The recommended reading and practice exercises`,
              `No resource is needed`,
              `Only one tutorial video`,
              `Skipping all extra material`,
            ],
            correctAnswer: 0,
            explanation: `Supplementary resources extend your learning beyond the core lessons.`,
          },
        ],
      },
    };
  }

  /**
   * General Chatbot Response
   */
  async chatResponse(message, history = []) {
    if (!this.apiKey) return "I'm currently in offline mode, but I can help you with basic platform navigation! Try asking about courses or pricing.";

    const platformContext = `
      You are the OAKSIS Academy Virtual Assistant. Your goal is to help users with questions about our platform, courses, and educational services.
      
      PLATFORM CONTEXT:
      - Academy: OAKSIS Academy (Premium Education Platform).
      - Key Courses: O-Level Mathematics, Web Development, German Language, Data Science, UI/UX Design.
      - Core Features: Professional video lectures, interactive quizzes, graded assignments, progress tracking, and verified certificates.
      - Business Model: Courses starting at $29, Premium Bundle at $99/year.
      
      BEHAVIOR RULES:
      1. ALWAYS respond to greetings (Hi, Hey, Hello) warmly and introduce yourself as the OAKSIS Assistant.
      2. If a user asks a question COMPLETELY UNRELATED to OAKSIS Academy, learning, or education (e.g., weather, politics, jokes), respond with: "I'm specialized in helping you navigate OAKSIS Academy! Please ask me something related to our courses, features, or platform services."
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
