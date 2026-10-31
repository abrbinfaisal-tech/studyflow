import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Structured Gemini error info
interface ParsedErrorInfo {
  statusCode: number;
  errorCode: 'MODEL_BUSY_503' | 'USAGE_LIMIT_429' | 'AUTH_ERROR_401' | 'NETWORK_ERROR' | 'SERVICE_ERROR';
  friendlyMessage: string;
  technicalDetails?: string;
}

export function parseGeminiError(error: any): ParsedErrorInfo {
  const errStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || '');
  
  let code = error?.status || error?.code;
  let statusText = error?.statusText || '';
  let innerMsg = error?.message || '';

  try {
    const jsonMatch = errStr.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error) {
        if (parsed.error.code) code = parsed.error.code;
        if (parsed.error.status) statusText = parsed.error.status;
        if (parsed.error.message) innerMsg = parsed.error.message;
      }
    }
  } catch (e) {
    // ignore json parse error
  }

  // 1. 503 / Service Unavailable / High demand
  if (
    code === 503 ||
    statusText === 'UNAVAILABLE' ||
    errStr.includes('503') ||
    errStr.includes('high demand') ||
    errStr.includes('overloaded') ||
    innerMsg.includes('high demand')
  ) {
    return {
      statusCode: 503,
      errorCode: 'MODEL_BUSY_503',
      friendlyMessage: 'Our AI tutor is temporarily busy. Please try again in a moment.',
      technicalDetails: innerMsg || 'Model experiencing high demand (503 UNAVAILABLE)',
    };
  }

  // 2. 429 / Resource Exhausted / Quota
  if (
    code === 429 ||
    statusText === 'RESOURCE_EXHAUSTED' ||
    errStr.includes('429') ||
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('quota') ||
    errStr.includes('usage limit')
  ) {
    return {
      statusCode: 429,
      errorCode: 'USAGE_LIMIT_429',
      friendlyMessage: 'The usage limit has been reached. Please wait a moment before trying again.',
      technicalDetails: innerMsg || 'API rate limit reached (429 RESOURCE_EXHAUSTED)',
    };
  }

  // 3. 401 / 403 / Authentication
  if (
    code === 401 ||
    code === 403 ||
    statusText === 'PERMISSION_DENIED' ||
    statusText === 'UNAUTHENTICATED' ||
    errStr.includes('401') ||
    errStr.includes('403') ||
    errStr.includes('API_KEY_INVALID') ||
    errStr.includes('PERMISSION_DENIED') ||
    errStr.includes('authentication')
  ) {
    return {
      statusCode: 401,
      errorCode: 'AUTH_ERROR_401',
      friendlyMessage: 'API authentication needs attention. Please verify your API key in Settings > Secrets.',
      technicalDetails: innerMsg || 'Authentication failed (401/403)',
    };
  }

  // 4. Network / Connectivity
  if (
    errStr.includes('ECONNRESET') ||
    errStr.includes('ENOTFOUND') ||
    errStr.includes('ETIMEDOUT') ||
    errStr.includes('fetch failed') ||
    errStr.includes('network')
  ) {
    return {
      statusCode: 502,
      errorCode: 'NETWORK_ERROR',
      friendlyMessage: 'Connection to the AI service failed. Please check your network connection and try again.',
      technicalDetails: innerMsg || 'Network connection failed',
    };
  }

  return {
    statusCode: 500,
    errorCode: 'SERVICE_ERROR',
    friendlyMessage: 'Our AI tutor is temporarily busy. Please try again in a moment.',
    technicalDetails: innerMsg || errStr.slice(0, 150),
  };
}

export function sendStructuredError(res: Response, error: any): void {
  const parsed = parseGeminiError(error);
  if (parsed.statusCode === 429) {
    res.setHeader('Retry-After', '3');
  }
  if (!res.headersSent) {
    res.status(parsed.statusCode).json({
      error: parsed.friendlyMessage,
      errorCode: parsed.errorCode,
      statusCode: parsed.statusCode,
      retryAfter: parsed.statusCode === 429 ? 3 : undefined,
      technicalDetails: parsed.technicalDetails,
    });
  } else {
    res.write(`data: ${JSON.stringify({ error: parsed.friendlyMessage, errorCode: parsed.errorCode, statusCode: parsed.statusCode })}\n\n`);
    res.end();
  }
}

// Supported active models from @google/genai guidelines
const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

// Exponential backoff with jitter and supported model fallback
async function generateContentWithSmartRetry(
  ai: GoogleGenAI, 
  params: any, 
  maxRetries = 3
): Promise<{ response: any; modelUsed: string; retriesDone: number }> {
  let lastError: any = null;
  let modelToUse = params.model || PRIMARY_MODEL;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: modelToUse,
      });
      return { response, modelUsed: modelToUse, retriesDone: attempt - 1 };
    } catch (err: any) {
      lastError = err;
      const parsed = parseGeminiError(err);

      // Check if transient 429 (rate limit), 503 (high demand) or network error that benefits from exponential retry
      const isTransient = parsed.statusCode === 429 || parsed.statusCode === 503 || parsed.errorCode === 'NETWORK_ERROR';

      if (isTransient && attempt < maxRetries) {
        // Exponential backoff with small random jitter (150ms - 450ms)
        const jitter = Math.floor(Math.random() * 300) + 150;
        const delay = Math.pow(2, attempt - 1) * 1000 + jitter; // ~1.2s, ~2.3s
        console.warn(`[AI Service] Attempt ${attempt}/${maxRetries} failed (${parsed.errorCode} - HTTP ${parsed.statusCode}). Retrying in ${delay}ms with jitter...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If primary model failed all attempts with 429/503, try the supported fallback model
      if (isTransient && modelToUse === PRIMARY_MODEL && attempt === maxRetries) {
        console.warn(`[AI Service] ${PRIMARY_MODEL} rate-limited or busy after ${maxRetries} attempts. Switching to supported alternative model ${FALLBACK_MODEL}...`);
        try {
          const fallbackResponse = await ai.models.generateContent({
            ...params,
            model: FALLBACK_MODEL,
          });
          return { response: fallbackResponse, modelUsed: FALLBACK_MODEL, retriesDone: maxRetries };
        } catch (fallbackErr: any) {
          console.error(`[AI Service] Fallback model ${FALLBACK_MODEL} also failed:`, fallbackErr);
          lastError = fallbackErr;
        }
      }

      throw err;
    }
  }

  throw lastError;
}

// Health Check API
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Shared Tutor System Instruction
const buildTutorSystemInstruction = (gradeLevel?: string, requestAssessment = false) => `You are "Study Flow AI Tutor", a world-class, encouraging, patient, and pedagogically brilliant personal tutor for school and college students.
Tagline: "Your Studies, Your Pace, Your Success"

Your instructions:
1. Tone & Style: Warm, inspiring, crystal clear, and structured. Adapt dynamically to the student's topic and grade level (${gradeLevel || 'high school/college'}).
2. Step-by-Step Clarity: Break down complex concepts into digestible intuition first, followed by clear mechanisms, analogies, and practical examples.
3. Math, Chemistry & Scientific Notation:
   - Always render mathematical formulas, physics laws, and chemical equations using standard KaTeX notation with standard delimiters:
     * Inline equations: use $...$ or \\(...\\) (e.g. $F = m \\times a$, $E = mc^2$, $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$).
     * Block equations: use $$...$$ on separate lines (e.g. $$2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}$$).
     * Fractions: use \\frac{numerator}{denominator}.
     * Square roots: use \\sqrt{expression}.
     * Chemistry equations: use \\text{} for elements, subscripts for stoichiometry/atoms (e.g. $$2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}$$).
     * NEVER enclose mathematical or chemical equations in code blocks or monospaced text.
     * Always explain the meaning of symbols underneath equations whenever appropriate.
4. Visuals & Diagrams: Whenever a visual diagram helps the student (e.g. geometric figures, physics vectors/circuits, biology processes, flowcharts, data structures, chemical cycles), include a clean, standalone, responsive SVG diagram wrapped in a \`\`\`xml:svg ... \`\`\` code block (with viewBox, nice modern purple/indigo/slate dark palette colors, legible labels).
5. Follow-ups & Next Steps: At the very end of your response, ALWAYS include 3 helpful follow-up questions or prompts the student might ask next, formatted strictly as:
<<<SUGGESTIONS: ["Question 1", "Question 2", "Question 3"]>>>
6. Assessments: ${requestAssessment ? 'The student explicitly requested an assessment! After a short encouraging summary, provide 3 well-crafted multiple-choice questions to test their understanding. Include them strictly formatted at the end as:' : 'If the student asks to be quizzed or tested, or if a topic has been fully explained, provide an optional 3-question quiz formatted as:'}
<<<QUIZ: [
  {
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why Option A is correct..."
  }
]>>>`;

// AI Tutor Chat Stream Endpoint (SSE for fast, progressive responses)
app.post('/api/tutor/chat/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, userMessage, topic, gradeLevel, requestAssessment, attachment } = req.body;

    // Simulation hooks for testing error responses (503, 429, 401, network)
    const simulateError = (req.headers['x-simulate-error'] as string) || req.body?.simulateError;
    if (simulateError === '503') {
      const err: any = new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}');
      err.status = 503;
      throw err;
    }
    if (simulateError === '429') {
      const err: any = new Error('{"error":{"code":429,"message":"Resource has been exhausted (e.g. check quota).","status":"RESOURCE_EXHAUSTED"}}');
      err.status = 429;
      throw err;
    }
    if (simulateError === '401') {
      const err: any = new Error('{"error":{"code":401,"message":"API key not valid. Please pass a valid API key.","status":"UNAUTHENTICATED"}}');
      err.status = 401;
      throw err;
    }
    if (simulateError === 'network') {
      const err: any = new Error('fetch failed: connect ECONNREFUSED 127.0.0.1');
      throw err;
    }

    const ai = getGeminiClient();
    const systemInstruction = buildTutorSystemInstruction(gradeLevel, requestAssessment);

    // Optimized history trimming: Keep last 6 messages to avoid slow prompt token processing
    const contents: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      const recent = messages.slice(-6);
      for (const m of recent) {
        contents.push({
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    }

    const currentParts: any[] = [];
    if (attachment && attachment.data && attachment.mimeType) {
      currentParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        },
      });
    }

    let promptText = userMessage || 'Hello Tutor!';
    if (topic && !userMessage) {
      promptText = `Please teach me the topic: "${topic}". Explain the core intuition, key formulas/rules, common exam pitfalls, and give a clear example.`;
    }
    if (requestAssessment) {
      promptText += `\nPlease also provide a 3-question assessment to test my mastery of this concept.`;
    }

    currentParts.push({ text: promptText });
    contents.push({ role: 'user', parts: currentParts });

    // Fast streaming with gemini-3.8-flash and ThinkingLevel.LOW to minimize latency
    // If rate-limited (429) or overloaded (503), retry with exponential backoff and jitter before fallback to gemini-3.1-flash-lite
    let stream;
    let modelUsed = PRIMARY_MODEL;
    const maxStreamAttempts = 3;
    let lastStreamErr: any = null;

    for (let streamAttempt = 1; streamAttempt <= maxStreamAttempts; streamAttempt++) {
      try {
        stream = await ai.models.generateContentStream({
          model: modelUsed,
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
        break; // Stream initialized successfully
      } catch (streamInitErr: any) {
        lastStreamErr = streamInitErr;
        const parsedInit = parseGeminiError(streamInitErr);
        const isRetryable = parsedInit.statusCode === 429 || parsedInit.statusCode === 503 || parsedInit.errorCode === 'NETWORK_ERROR';

        if (isRetryable && streamAttempt < maxStreamAttempts) {
          const jitter = Math.floor(Math.random() * 300) + 150;
          const delay = Math.pow(2, streamAttempt - 1) * 1000 + jitter;
          console.warn(`[Stream] Attempt ${streamAttempt}/${maxStreamAttempts} failed (${parsedInit.errorCode}). Retrying stream in ${delay}ms with jitter...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (isRetryable && modelUsed === PRIMARY_MODEL) {
          console.warn(`[Stream] ${PRIMARY_MODEL} rate-limited or busy after ${streamAttempt} attempts. Switching to fallback ${FALLBACK_MODEL}...`);
          try {
            stream = await ai.models.generateContentStream({
              model: FALLBACK_MODEL,
              contents,
              config: { systemInstruction },
            });
            modelUsed = FALLBACK_MODEL;
            break;
          } catch (fallbackErr: any) {
            lastStreamErr = fallbackErr;
          }
        }

        throw streamInitErr;
      }
    }

    if (!stream) {
      throw lastStreamErr || new Error('Failed to initialize AI stream');
    }

    // Set headers for Server-Sent Events after successful model connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let fullText = '';
    for await (const chunk of stream) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    }

    // Parse suggestions and quiz from complete text
    let suggestions: string[] = [];
    const suggestionsMatch = fullText.match(/<<<SUGGESTIONS:\s*(\[.*?\])\s*>>>/s);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1]);
      } catch (e) {
        suggestions = ['Can you give a practical example?', 'What are common exam mistakes?', 'Quiz me on this concept!'];
      }
    } else {
      suggestions = ['Can you explain this with an analogy?', 'What formula is most important here?', 'Can you test my knowledge?'];
    }

    let quiz: any[] | null = null;
    const quizMatch = fullText.match(/<<<QUIZ:\s*(\[.*?\])\s*>>>/s);
    if (quizMatch) {
      try {
        quiz = JSON.parse(quizMatch[1]);
      } catch (e) {
        console.error('Failed to parse quiz block', e);
      }
    }

    // Strip custom tags from clean text
    const cleanText = fullText
      .replace(/<<<SUGGESTIONS:.*?>>>/gs, '')
      .replace(/<<<QUIZ:.*?>>>/gs, '')
      .trim();

    res.write(`data: ${JSON.stringify({ done: true, fullText: cleanText, suggestions, quiz, modelUsed })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error in /api/tutor/chat/stream:', error);
    sendStructuredError(res, error);
  }
});

// AI Tutor Chat Standard Endpoint (with Smart Retry & History Trimming)
app.post('/api/tutor/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, userMessage, topic, gradeLevel, requestAssessment, attachment } = req.body;

    // Simulation hooks for testing error responses (503, 429, 401, network)
    const simulateError = (req.headers['x-simulate-error'] as string) || req.body?.simulateError;
    if (simulateError === '503') {
      const err: any = new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}');
      err.status = 503;
      throw err;
    }
    if (simulateError === '429') {
      const err: any = new Error('{"error":{"code":429,"message":"Resource has been exhausted (e.g. check quota).","status":"RESOURCE_EXHAUSTED"}}');
      err.status = 429;
      throw err;
    }
    if (simulateError === '401') {
      const err: any = new Error('{"error":{"code":401,"message":"API key not valid. Please pass a valid API key.","status":"UNAUTHENTICATED"}}');
      err.status = 401;
      throw err;
    }
    if (simulateError === 'network') {
      const err: any = new Error('fetch failed: connect ECONNREFUSED 127.0.0.1');
      throw err;
    }

    const ai = getGeminiClient();
    const systemInstruction = buildTutorSystemInstruction(gradeLevel, requestAssessment);

    // Optimized history trimming: Keep last 6 messages
    const contents: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      const recent = messages.slice(-6);
      for (const m of recent) {
        contents.push({
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }
    }

    const currentParts: any[] = [];
    if (attachment && attachment.data && attachment.mimeType) {
      currentParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        },
      });
    }

    let promptText = userMessage || 'Hello Tutor!';
    if (topic && !userMessage) {
      promptText = `Please teach me the topic: "${topic}". Explain the core intuition, key formulas/rules, common exam pitfalls, and give a clear example.`;
    }
    if (requestAssessment) {
      promptText += `\nPlease also provide a 3-question assessment to test my mastery of this concept.`;
    }

    currentParts.push({ text: promptText });
    contents.push({ role: 'user', parts: currentParts });

    const { response, modelUsed } = await generateContentWithSmartRetry(ai, {
      model: PRIMARY_MODEL,
      contents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const reply = response.text || '';

    // Parse suggestions and quiz if present
    let suggestions: string[] = [];
    const suggestionsMatch = reply.match(/<<<SUGGESTIONS:\s*(\[.*?\])\s*>>>/s);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1]);
      } catch (e) {
        suggestions = ['Can you give a practical example?', 'What are common exam mistakes?', 'Quiz me on this concept!'];
      }
    } else {
      suggestions = ['Can you explain this with an analogy?', 'What formula is most important here?', 'Can you test my knowledge?'];
    }

    let quiz: any[] | null = null;
    const quizMatch = reply.match(/<<<QUIZ:\s*(\[.*?\])\s*>>>/s);
    if (quizMatch) {
      try {
        quiz = JSON.parse(quizMatch[1]);
      } catch (e) {
        console.error('Failed to parse quiz block', e);
      }
    }

    // Clean text by stripping custom meta tags for presentation
    const cleanText = reply
      .replace(/<<<SUGGESTIONS:.*?>>>/gs, '')
      .replace(/<<<QUIZ:.*?>>>/gs, '')
      .trim();

    res.json({
      text: cleanText,
      rawText: reply,
      suggestions,
      quiz,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/tutor/chat:', error);
    sendStructuredError(res, error);
  }
});

// AI Study Roadmap Generator Endpoint
app.post('/api/roadmap/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      subject,
      syllabusText,
      deadlineDate,
      dailyMinutes,
      knowledgeLevel,
      attachment,
    } = req.body;

    const ai = getGeminiClient();

    const parts: any[] = [];
    if (attachment && attachment.data && attachment.mimeType) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        },
      });
    }

    const prompt = `You are Study Flow AI Roadmap Architect. Create a highly realistic, personalized, day-by-day study roadmap for a student.
Target Subject / Syllabus: ${subject || 'General Academic Chapter'}
Student Current Level: ${knowledgeLevel || 'Intermediate'}
Daily Study Time Available: ${dailyMinutes || 60} minutes per day
Target Exam / Completion Deadline: ${deadlineDate || 'Within 2 weeks'}
Uploaded Syllabus / Chapter Content:
${syllabusText || 'No extra text provided; build a comprehensive curriculum for this subject.'}

Generate an actionable, balanced plan that includes concept learning, practical problem solving, targeted revision, and mock testing. Do not overload days unrealistically. Each day must fit within the daily study time limit of ${dailyMinutes || 60} minutes.`;

    parts.push({ text: prompt });

    const { response } = await generateContentWithSmartRetry(ai, {
      model: PRIMARY_MODEL,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmapTitle: { type: Type.STRING },
            subject: { type: Type.STRING },
            summary: { type: Type.STRING },
            totalDays: { type: Type.INTEGER },
            dailyMinutes: { type: Type.INTEGER },
            totalHoursEstimated: { type: Type.NUMBER },
            keyMilestones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  phase: { type: Type.STRING, description: 'e.g. Fundamentals, Deep Dive, Practice, Revision, Mastery' },
                  estimatedMinutes: { type: Type.INTEGER },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        topic: { type: Type.STRING },
                        taskType: { type: Type.STRING, description: 'theory, problem-solving, revision, formula-memorization, or quiz' },
                        durationMinutes: { type: Type.INTEGER },
                        learningObjectives: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        tutorPrompt: { type: Type.STRING, description: 'Prompt for the student to send to AI Tutor for this task' },
                      },
                      required: ['id', 'title', 'topic', 'durationMinutes', 'taskType', 'tutorPrompt'],
                    },
                  },
                },
                required: ['dayNumber', 'title', 'theme', 'phase', 'estimatedMinutes', 'tasks'],
              },
            },
          },
          required: ['roadmapTitle', 'subject', 'summary', 'totalDays', 'dailyMinutes', 'totalHoursEstimated', 'days'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/roadmap/generate:', error);
    sendStructuredError(res, error);
  }
});

// AI Paper Analyzer Endpoint
app.post('/api/paper/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paperTitle, paperText, attachment, examType } = req.body;

    const ai = getGeminiClient();

    const parts: any[] = [];
    if (attachment && attachment.data && attachment.mimeType) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        },
      });
    }

    const prompt = `You are Study Flow AI Exam Paper Analyzer.
Analyze the examination paper provided (either through text or attached document/image):
Exam Title / Context: ${paperTitle || 'Examination Paper'}
Exam Level / Type: ${examType || 'General High School / University Exam'}

Paper text content:
${paperText || 'Analyze the attached document carefully.'}

Analyze every visible question or section:
1. Identify all core topics tested.
2. Group and classify questions by difficulty: "Easy", "Moderate", or "Hard", providing a clear justification for why it's easy/moderate/hard.
3. Assign topic priority for revision: "High", "Medium", or "Low", explaining the strategic reason (e.g. high mark allocation, recurring exam concept, fundamental building block).
4. Extract key formulas, theorems, and definitions tested.
5. Provide actionable revision recommendations to maximize exam scores.`;

    parts.push({ text: prompt });

    const { response } = await generateContentWithSmartRetry(ai, {
      model: PRIMARY_MODEL,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            paperSummary: { type: Type.STRING },
            identifiedSubject: { type: Type.STRING },
            totalQuestionsAnalyzed: { type: Type.INTEGER },
            difficultyStats: {
              type: Type.OBJECT,
              properties: {
                easyPercentage: { type: Type.INTEGER },
                moderatePercentage: { type: Type.INTEGER },
                hardPercentage: { type: Type.INTEGER },
                summary: { type: Type.STRING },
              },
              required: ['easyPercentage', 'moderatePercentage', 'hardPercentage', 'summary'],
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topicName: { type: Type.STRING },
                  priority: { type: Type.STRING, description: 'High, Medium, or Low' },
                  difficultyTendency: { type: Type.STRING, description: 'Easy, Moderate, or Hard' },
                  questionCount: { type: Type.INTEGER },
                  estimatedMarksWeightage: { type: Type.STRING },
                  priorityReason: { type: Type.STRING },
                  actionableAdvice: { type: Type.STRING },
                  keyFormulasOrConcepts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['topicName', 'priority', 'difficultyTendency', 'priorityReason', 'actionableAdvice'],
              },
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionNumber: { type: Type.STRING },
                  questionSnippet: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: 'Easy, Moderate, or Hard' },
                  difficultyReason: { type: Type.STRING },
                  marks: { type: Type.STRING },
                  tutorPrompt: { type: Type.STRING, description: 'Prompt to ask AI Tutor to solve and explain this specific question' },
                },
                required: ['questionNumber', 'questionSnippet', 'topic', 'difficulty', 'difficultyReason', 'tutorPrompt'],
              },
            },
            strategicRevisionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['paperSummary', 'identifiedSubject', 'totalQuestionsAnalyzed', 'difficultyStats', 'topics', 'questions', 'strategicRevisionPlan'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/paper/analyze:', error);
    sendStructuredError(res, error);
  }
});

// Vite Middleware or Static Serving
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Study Flow server running at http://0.0.0.0:${port}`);
});
