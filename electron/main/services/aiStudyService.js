/* ===== AI Study Service — Ollama & Gemini =====
   Handles AI chat for study planning, plan generation, and quiz generation.
*/

import http from 'node:http';
import https from 'node:https';
import { loadStudySettings } from './studyPlannerStore.js';
import { geminiRequestWithFallback } from './geminiApi.js';
import { bedrockConverse } from './bedrockApi.js';
import { getContextForQuery, getContextForPlan, getContextForQuiz } from './documentContext.js';

// Models known to be too small to reliably output JSON
const WEAK_MODELS = ['qwen2.5:1.5b', 'tinyllama', 'phi3:mini', 'phi:mini', 'gemma:2b', 'orca-mini'];

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const OLLAMA_MODEL_DEFAULT = 'qwen2.5:7b';


// ===== HTTP Helpers =====

function ollamaRequest(path, body, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const url = new URL(path, OLLAMA_BASE);

    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(postData);
    req.end();
  });
}



// ===== System Prompts =====

const CHAT_SYSTEM_PROMPT = `Role: AI study consultant. Goal: Collect info to build a study plan.
1. Match user's language (default VI). Support ALL subjects/languages.
2. Collect: Subject, Topic, Level, Goal, Total Duration, Daily Hours.
3. If at least Subject, Topic, and Level are provided, set readyToGenerate=true and append "I have enough information. Would you like me to generate your study plan now?" to reply.
4. Ask naturally, keep brief (3-4 sentences).
5. ONLY RETURN JSON: {"reply":"...","collectedInfo":{"subject":"","topic":"","level":"","goal":"","totalDuration":"","dailyHours":""},"readyToGenerate":false}`;

const PLAN_SYSTEM_PROMPT = `Role: Study Plan Generator. ONLY RETURN JSON.
Rules:
1. Adherence: Strictly base the plan on the user's info & document. Divide logically into phases matching the doc's chapters/sections. NO hallucinations.
2. Detail: Provide highly detailed phase descriptions and exact topics from the doc to enable accurate future quizzes.
3. Language: Match user's input language exactly.
4. Structure (Adaptive): Adapt the number of phases and topics dynamically based on the user's "Total Duration" and the document length. Short goals/docs may only need 1-2 phases. Do not force a fixed number.
Format: {"_self_check": {"adherence": "?", "structure": "?"}, "title":"...","description":"...","phases":[{"id":1,"name":"...","duration":"...","description":"...","topics":["..."],"resources":[{"name":"...","url":"...","type":"website"}],"completed":false}]}`;

const QUIZ_SYSTEM_PROMPT = `Role: Quiz Generator. ONLY RETURN JSON.
Rules:
1. Adherence & Focus: Strictly generate 10 unique 4-option MCQs based ONLY on the requested Phase's topics and provided document. NO external facts. NO questions from other phases.
2. Language: Match Phase language. If testing a foreign language, test directly WITHOUT translations/hints in the question text.
Format: {"_self_check": {"adherence": "?", "language": "?"}, "questions":[{"id":1,"question":"...","options":["A...","B...","C...","D..."],"correctAnswer":"A"}]}`;

// Load AI settings from the main electron-store (saved by storeIpc aiSettings)
async function getAiSettings() {
  try {
    const settingsResult = loadStudySettings();
    const s = (settingsResult.success && settingsResult.data) ? settingsResult.data : {};
    return {
      aiProvider: s.aiProvider || 'bedrock',
      geminiKey: s.geminiKey || '',
      selectedModel: s.selectedModel || OLLAMA_MODEL_DEFAULT,
      bedrockAccessKey: s.bedrockAccessKey || '',
      bedrockSecretKey: s.bedrockSecretKey || '',
      bedrockRegion: s.bedrockRegion || 'us-east-1',
      bedrockModel: s.bedrockModel || 'amazon.nova-lite-v1:0',
    };
  } catch {
    return { aiProvider: 'bedrock', geminiKey: '', selectedModel: OLLAMA_MODEL_DEFAULT,
             bedrockAccessKey: '', bedrockSecretKey: '', bedrockRegion: 'us-east-1', bedrockModel: 'amazon.nova-lite-v1:0' };
  }
}

/**
 * Gọi Bedrock (sử dụng credentials từ .env, không cần truyền key)
 */
async function bedrockChatJSON(systemPrompt, messages, maxTokens = 1024) {
  const { text, usage } = await bedrockConverse({ systemPrompt, messages, maxTokens, timeoutMs: 120000 });
  const inTokens = usage?.inputTokens || 0;
  const outTokens = usage?.outputTokens || 0;
  console.log(`[AIStudy] 📊 Bedrock Tokens (StudyPlanner): In=${inTokens}, Out=${outTokens}`);
  return text;
}

function warnIfWeakModel(model) {
  const isWeak = WEAK_MODELS.some(w => model.toLowerCase().startsWith(w));
  if (isWeak) {
    console.warn(`[AIStudy] ⚠️  Model "${model}" is very small and may NOT produce valid JSON.`);
    console.warn('[AIStudy] ⚠️  For study plan/quiz generation, use at least qwen2.5:7b or qwen3:8b.');
  }
}

// Format messages for Gemini (requires alternating roles, systemInstruction separately)
function formatGeminiMessages(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
}

function parseResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// ===== Core Functions =====

export async function chatWithAI(messages) {
  try {
    const config = await getAiSettings();
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const docContext = getContextForQuery(lastUserMsg);
    
    let finalSystemPrompt = CHAT_SYSTEM_PROMPT;
    if (docContext) {
      finalSystemPrompt += `\n\nIF THE USER ASKS ABOUT STUDY MATERIALS OR KNOWLEDGE, PLEASE BASE YOUR ANSWER ON THE FOLLOWING DOCUMENT. IF THE USER IS JUST GREETING, YOU DON'T NEED TO USE IT.\n\n${docContext.summaryBlock}\n\n${docContext.chunksBlock}`;
    }

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      let geminiModel = config.selectedModel || 'gemini-2.0-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-2.0-flash';
      console.log(`[AIStudy] 🤖 Chat → Provider: Gemini | Model: ${geminiModel}`);
      const geminiBody = {
        system_instruction: { parts: [{ text: finalSystemPrompt }] },
        contents: formatGeminiMessages(messages),
        generationConfig: { temperature: 0.7 }
      };
      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 120000);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseResponse(content);
      if (parsed) return { success: true, reply: parsed.reply || content, collectedInfo: parsed.collectedInfo || {}, readyToGenerate: parsed.readyToGenerate || false };
      return { success: true, reply: content, collectedInfo: {}, readyToGenerate: false };

    } else if (config.aiProvider === 'bedrock') {
      console.log(`[AIStudy] 🤖 Chat → Provider: Bedrock | Model: ${process.env.BEDROCK_MODEL || 'nova-lite'}`);
      let bedrockSystemPrompt = finalSystemPrompt;
      if (bedrockSystemPrompt.length > 2000) bedrockSystemPrompt = bedrockSystemPrompt.slice(0, 2000);
      const content = await bedrockChatJSON(bedrockSystemPrompt, messages, 1024);
      const parsed = parseResponse(content);
      if (parsed) return { success: true, reply: parsed.reply || content, collectedInfo: parsed.collectedInfo || {}, readyToGenerate: parsed.readyToGenerate || false };
      return { success: true, reply: content, collectedInfo: {}, readyToGenerate: false };

    } else {
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] 🤖 Chat → Provider: Ollama | Model: ${ollamaModel}`);
      warnIfWeakModel(ollamaModel);
      let ollamaSystemPrompt = CHAT_SYSTEM_PROMPT;
      if (docContext && docContext.summaryBlock) {
        const shortSummary = docContext.summaryBlock.slice(0, 600);
        ollamaSystemPrompt += `\n\nATTACHED DOCUMENT (short summary): ${shortSummary}`;
      }
      const ollamaMessages = [
        { role: 'system', content: ollamaSystemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];
      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel, messages: ollamaMessages, stream: false, format: 'json',
        options: { temperature: 0.7, num_predict: 1024, num_ctx: 4096 },
      }, 300000);
      const content = result.message?.content || '';
      const parsed = parseResponse(content);
      if (parsed) return { success: true, reply: parsed.reply || content, collectedInfo: parsed.collectedInfo || {}, readyToGenerate: parsed.readyToGenerate || false };
      return { success: true, reply: content, collectedInfo: {}, readyToGenerate: false };
    }
  } catch (error) {
    if (!error.message.includes('ECONNREFUSED')) console.error('[AIStudy] Chat error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== Self-Correction Logic =====

function validatePlan(planJSON) {
  if (!planJSON) return "Invalid JSON format.";
  if (!planJSON.phases || !Array.isArray(planJSON.phases) || planJSON.phases.length === 0) {
    return "Missing or empty 'phases' array.";
  }
  for (const phase of planJSON.phases) {
    if (!phase.name || !phase.description || !phase.topics || !Array.isArray(phase.topics)) {
      return "Each phase must have a 'name', 'description', and 'topics' array.";
    }
  }
  return null;
}

function shuffleQuizAnswers(quizJSON) {
  if (!quizJSON || !Array.isArray(quizJSON.questions)) return;
  quizJSON.questions.forEach(q => {
    if (!q.options || q.options.length !== 4 || !q.correctAnswer) return;
    
    let ansLetter = q.correctAnswer.toString().toUpperCase().trim().charAt(0);
    let correctIndex = ansLetter.charCodeAt(0) - 65;
    if (correctIndex < 0 || correctIndex > 3) return;
    
    // Get raw correct answer text
    let correctOptionRaw = q.options[correctIndex].replace(/^[A-D][\.\:\)]\s*/i, '');
    
    // Clean all options
    let rawOptions = q.options.map(opt => opt.replace(/^[A-D][\.\:\)]\s*/i, ''));
    
    // Shuffle raw options
    for (let i = rawOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rawOptions[i], rawOptions[j]] = [rawOptions[j], rawOptions[i]];
    }
    
    // Re-assign A, B, C, D
    const prefixes = ['A. ', 'B. ', 'C. ', 'D. '];
    q.options = rawOptions.map((opt, i) => prefixes[i] + opt);
    
    // Find new correct answer
    let newCorrectIndex = rawOptions.findIndex(opt => opt === correctOptionRaw);
    if (newCorrectIndex !== -1) {
        q.correctAnswer = String.fromCharCode(65 + newCorrectIndex);
    }
  });
}

function validateQuiz(quizJSON) {
  if (!quizJSON) return "Invalid JSON format.";
  if (!quizJSON.questions || !Array.isArray(quizJSON.questions) || quizJSON.questions.length !== 10) {
    return "You must generate exactly 10 questions in the 'questions' array.";
  }
  for (const q of quizJSON.questions) {
     if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
       return "Each question must have a 'question', 4 'options', and a 'correctAnswer'.";
     }
  }
  
  // Shuffle options in JS to guarantee perfect randomization without relying on AI
  shuffleQuizAnswers(quizJSON);
  
  return null;
}

async function callAiWithRetry(config, systemPrompt, initialUserPrompt, type, maxRetries = 2) {
  let userPrompt = initialUserPrompt;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    attempt++;
    let text = '';
    try {
      if (config.aiProvider === 'gemini' && config.geminiKey) {
        let geminiModel = config.selectedModel || 'gemini-2.0-flash';
        if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-2.0-flash';
        console.log(`[AIStudy] Generate ${type} (Attempt ${attempt}) → Gemini | ${geminiModel}`);
        const geminiBody = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.6 }
        };
        const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 60000);
        if (result.error) throw new Error(result.error.message || 'Gemini API Error');
        text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (config.aiProvider === 'bedrock') {
        console.log(`[AIStudy] Generate ${type} (Attempt ${attempt}) → Bedrock`);
        text = await bedrockChatJSON(systemPrompt, [{ role: 'user', content: userPrompt }], 2048);
      } else {
        const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
        console.log(`[AIStudy] Generate ${type} (Attempt ${attempt}) → Ollama | ${ollamaModel}`);
        warnIfWeakModel(ollamaModel);
        const result = await ollamaRequest('/api/chat', {
          model: ollamaModel,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          stream: false, format: 'json',
          options: { temperature: 0.6, num_predict: 2048 }
        }, 600000);
        text = result.message?.content || '';
      }
      
      const parsed = parseResponse(text);
      const validator = type === 'Plan' ? validatePlan : validateQuiz;
      const errorMsg = validator(parsed);
      
      if (!errorMsg) {
        return { success: true, data: parsed };
      }
      
      console.warn(`[AIStudy] Validation failed for ${type} on attempt ${attempt}: ${errorMsg}`);
      if (attempt <= maxRetries) {
        userPrompt += `\n\n[SYSTEM] ERROR IN YOUR PREVIOUS ATTEMPT: ${errorMsg}\nPlease fix this error and generate the JSON again. Strictly follow all rules.`;
      } else {
        return { success: false, error: `Validation failed: ${errorMsg}` };
      }
    } catch (e) {
      console.warn(`[AIStudy] API Error on attempt ${attempt}: ${e.message}`);
      if (attempt > maxRetries) {
        return { success: false, error: e.message };
      }
    }
  }
}

export async function generateStudyPlan(collectedInfo) {
  try {
    const config = await getAiSettings();
    const docContext = getContextForPlan();
    
    let userPrompt = `Generate a study plan:
- Subject: ${collectedInfo.subject || 'Unknown'}
- Topic: ${collectedInfo.topic || 'Unknown'}
- Current Level: ${collectedInfo.level || 'Beginner'}
- Goal: ${collectedInfo.goal || 'Unknown'}
- Total Duration: ${collectedInfo.totalDuration || 'Flexible'}
- Daily Study Hours: ${collectedInfo.dailyHours || 'Flexible'}`;

    if (docContext) {
      userPrompt += `\n\n=== ATTACHED DOCUMENT ===\nDocument Name: ${docContext.fileName}\nSummary: ${docContext.summary}\nTopics: ${docContext.topics.join(', ')}\nDocument Structure:\n${docContext.structureBlock}\n\nSPECIAL REQUIREMENT: Create phases that closely follow this Document Structure. Ensure the study plan accurately reflects the content of the document.`;
    }
    
    userPrompt += `\nONLY RETURN JSON.`;

    const result = await callAiWithRetry(config, PLAN_SYSTEM_PROMPT, userPrompt, 'Plan');
    if (result.success) return { success: true, plan: result.data };
    return { success: false, error: result.error };

  } catch (error) {
    if (!error.message.includes('ECONNREFUSED')) {
      console.error('[AIStudy] Generate plan error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

export async function generateQuiz(phase, planTitle) {
  try {
    const config = await getAiSettings();
    const docContext = getContextForQuiz(phase.name, phase.topics);
    
    let userPrompt = `Context: Study Plan "${planTitle}"\nGenerate 10 multiple choice questions about the phase: ${phase.name}\nTopics to focus on: ${(phase.topics || []).join(', ')}`;

    if (docContext) {
      userPrompt += `\n\n=== CONTENT FROM DOCUMENT (${docContext.fileName}) ===\n${docContext.contentBlock}\n\nREQUIREMENT: Generate questions strictly based 100% on this document. Do not invent facts outside of the document.`;
    }

    userPrompt += `\nONLY RETURN JSON.`;

    const result = await callAiWithRetry(config, QUIZ_SYSTEM_PROMPT, userPrompt, 'Quiz');
    if (result.success) return { success: true, questions: result.data.questions };
    return { success: false, error: result.error };

  } catch (error) {
    console.error('[AIStudy] Generate quiz error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function summarizeDocument(chunks) {
  try {
    const config = await getAiSettings();

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      // === GEMINI: có thể nhận text dài ===
      const docText = chunks.map(c => `[${c.section}]\n${c.content}`).join('\n\n');
      const prompt = `Tóm tắt tài liệu sau trong khoảng 200-300 từ. Sau đó liệt kê các chủ đề chính.\nTÀI LIỆU:\n${docText}\n\nYÊU CẦU OUTPUT JSON: {"summary":"...","topics":["...","..."]}`;

      let geminiModel = config.selectedModel || 'gemini-2.0-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-2.0-flash';
      
      const geminiBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      };

      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 60000);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseResponse(content);
      if (parsed && parsed.summary) return { success: true, summary: parsed.summary, topics: parsed.topics || [] };
      console.error('[AIStudy] Gemini không trả về JSON hợp lệ:', content.slice(0, 200));

    } else if (config.aiProvider === 'bedrock') {
      // === BEDROCK: có thể nhận text dài ===
      const docText = chunks.map(c => `[${c.section}]\n${c.content}`).join('\n\n');
      const systemPrompt = "Bạn là AI tóm tắt tài liệu. Đọc văn bản sau và tóm tắt trong khoảng 150-250 từ. Sau đó liệt kê các chủ đề chính. TRẢ VỀ ĐÚNG FORMAT JSON, KHÔNG GIẢI THÍCH THÊM.";
      const userMessage = `VĂN BẢN:\n${docText}\n\nFORMAT JSON:\n{"summary":"tóm tắt...","topics":["chủ đề 1","chủ đề 2"]}`;

      console.log(`[AIStudy] 📄 Summarize Document → Bedrock | ${process.env.BEDROCK_MODEL || 'amazon.nova-lite-v1:0'}`);
      const content = await bedrockChatJSON(systemPrompt, [{ role: 'user', content: userMessage }], 1024);
      const parsed = parseResponse(content);
      if (parsed && parsed.summary) return { success: true, summary: parsed.summary, topics: parsed.topics || [] };
      console.error('[AIStudy] Bedrock không trả về JSON hợp lệ:', content.slice(0, 200));

    } else {
      // === OLLAMA LOCAL: giới hạn text rất nghiêm để tránh tràn context ===
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] Tóm tắt tài liệu bằng Ollama: ${ollamaModel}`);

      // Gộp text từ chunks rồi cắt cứng tối đa 2500 ký tự
      const rawText = chunks.map(c => `[${c.section}] ${c.content}`).join(' ');
      const truncatedText = rawText.length > 2500 ? rawText.slice(0, 2500) + '...' : rawText;

      const sectionList = [...new Set(chunks.map(c => c.section))].slice(0, 8).join(', ');

      const prompt = `Bạn là AI tóm tắt tài liệu. Hãy đọc đoạn văn sau và trả về JSON.

VĂN BẢN:
${truncatedText}

CÁC PHẦN CÓ TRONG TÀI LIỆU: ${sectionList}

TRẢ VỀ ĐÚNG FORMAT JSON SAU, KHÔNG GIẢI THÍCH THÊM:
{"summary": "tóm tắt nội dung chính trong 100-150 từ", "topics": ["chủ đề 1", "chủ đề 2", "chủ đề 3"]}`;

      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
        options: { temperature: 0.1, num_predict: 1024, num_ctx: 4096 },
      }, 600000);

      console.log('[AIStudy] Ollama raw result keys:', Object.keys(result || {}));
      const content = result?.message?.content || result?.response || '';
      console.log('[AIStudy] Ollama content:', content.slice(0, 300));

      const parsed = parseResponse(content);
      if (parsed && parsed.summary) {
        return { success: true, summary: parsed.summary, topics: parsed.topics || [] };
      }
      console.error('[AIStudy] Ollama JSON parse thất bại. Content rỗng hoặc sai format.');
    }
  } catch (error) {
    console.error('[AIStudy] Summarize document error:', error.message);
  }
  return { success: false, summary: '', topics: [] };
}

