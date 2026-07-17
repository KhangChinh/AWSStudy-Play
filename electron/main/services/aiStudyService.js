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

const CHAT_SYSTEM_PROMPT = `You are an AI study consultant. Collect information from the user to create a study plan.
Reply in the language the user is using (prioritize Vietnamese if unclear). You support ALL subjects and languages, including Chinese, Japanese, Korean, etc.
YOU NEED TO COLLECT: 1. Subject 2. Specific topic 3. Current level 4. Goal 5. Total expected duration 6. Daily study hours
RULES: Ask naturally. If the user provides enough info (at least 1, 2, and 3), set readyToGenerate=true. Keep responses brief (3-4 sentences).
OUTPUT JSON ONLY (no markdown): {"reply":"...","collectedInfo":{"subject":"","topic":"","level":"","goal":"","totalDuration":"","dailyHours":""},"readyToGenerate":false}
When readyToGenerate=true, add this to your reply in the current language: "I have enough information. Would you like me to generate your study plan now?"`;

const PLAN_SYSTEM_PROMPT = `Create a study plan in JSON format. DO NOT explain, ONLY return JSON.
CRITICAL LANGUAGE RULE: You MUST generate the content (title, description, phases, topics, etc.) in the SAME LANGUAGE as the user's inputs. If the user's inputs are in Vietnamese, the ENTIRE OUTPUT MUST BE IN VIETNAMESE.
Format: {"title":"...","description":"...","phases":[{"id":1,"name":"...","duration":"...","description":"...","topics":["..."],"resources":[{"name":"...","url":"https://...","type":"website"}],"completed":false}]}
Create 4-5 phases, 2-3 topics per phase, 1-2 resources per phase. Be concise.`;

const QUIZ_SYSTEM_PROMPT = `Create a 10-question multiple choice quiz in JSON format. DO NOT explain, ONLY return JSON.
CRITICAL LANGUAGE RULE: You MUST generate the questions and options in the SAME LANGUAGE as the Phase name and Plan title. If they are in Vietnamese, the ENTIRE QUIZ MUST BE IN VIETNAMESE.
Format: {"questions":[{"id":1,"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A"}]}
Generate exactly 10 questions, each with 4 options (A/B/C/D). Ensure all questions are unique, diverse, and do not repeat.`;

// Load AI settings from the main electron-store (saved by storeIpc aiSettings)
async function getAiSettings() {
  try {
    const settingsResult = loadStudySettings();
    const s = (settingsResult.success && settingsResult.data) ? settingsResult.data : {};
    return {
      aiProvider: s.aiProvider || 'ollama',
      geminiKey: s.geminiKey || '',
      selectedModel: s.selectedModel || OLLAMA_MODEL_DEFAULT,
      bedrockAccessKey: s.bedrockAccessKey || '',
      bedrockSecretKey: s.bedrockSecretKey || '',
      bedrockRegion: s.bedrockRegion || 'us-east-1',
      bedrockModel: s.bedrockModel || 'amazon.nova-lite-v1:0',
    };
  } catch {
    return { aiProvider: 'ollama', geminiKey: '', selectedModel: OLLAMA_MODEL_DEFAULT,
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

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      let geminiModel = config.selectedModel || 'gemini-2.0-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-2.0-flash';
      console.log(`[AIStudy] 📋 Generate Plan → Gemini | ${geminiModel}`);
      const geminiBody = {
        system_instruction: { parts: [{ text: PLAN_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.6 }
      };
      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 60000);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      return { success: false, error: 'Khong the parse ke hoach tu Gemini' };

    } else if (config.aiProvider === 'bedrock') {
      console.log(`[AIStudy] 📋 Generate Plan → Bedrock | ${process.env.BEDROCK_MODEL || 'nova-lite'}`);
      const content = await bedrockChatJSON(PLAN_SYSTEM_PROMPT, [{ role: 'user', content: userPrompt }], 2048);
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      return { success: false, error: 'Bedrock: Khong the parse ke hoach' };

    } else {
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] 📋 Generate Plan → Ollama | ${ollamaModel}`);
      warnIfWeakModel(ollamaModel);
      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel,
        messages: [{ role: 'system', content: PLAN_SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
        stream: false, format: 'json',
        options: { temperature: 0.6, num_predict: 2048 },
      }, 600000);
      const content = result.message?.content || '';
      console.log('[AIStudy] 📋 Raw plan (200 chars):', content.substring(0, 200));
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      return { success: false, error: 'Ollama: Khong the parse ke hoach' };
    }
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
    
    let userPrompt = `Context: Study Plan "${planTitle}"
Generate 10 multiple choice questions about the phase: ${phase.name}
Topics to focus on: ${(phase.topics || []).join(', ')}`;

    if (docContext) {
      userPrompt += `\n\n=== CONTENT FROM DOCUMENT (${docContext.fileName}) ===\n${docContext.contentBlock}\n\nREQUIREMENT: Generate questions strictly based 100% on this document. Do not invent facts outside of the document.`;
    }

    userPrompt += `\nONLY RETURN JSON.`;

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      let geminiModel = config.selectedModel || 'gemini-2.0-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-2.0-flash';
      console.log(`[AIStudy] 📝 Generate Quiz → Gemini | ${geminiModel}`);
      const geminiBody = {
        system_instruction: { parts: [{ text: QUIZ_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      };
      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 60000);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseResponse(content);
      if (parsed && parsed.questions) return { success: true, questions: parsed.questions };
      return { success: false, error: 'Khong the parse quiz tu Gemini' };

    } else if (config.aiProvider === 'bedrock') {
      console.log(`[AIStudy] 📝 Generate Quiz → Bedrock | ${process.env.BEDROCK_MODEL || 'nova-lite'}`);
      const content = await bedrockChatJSON(QUIZ_SYSTEM_PROMPT, [{ role: 'user', content: userPrompt }], 2048);
      const parsed = parseResponse(content);
      if (parsed && parsed.questions) return { success: true, questions: parsed.questions };
      return { success: false, error: 'Bedrock: Khong the parse quiz' };

    } else {
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] 📝 Generate Quiz → Ollama | ${ollamaModel}`);
      warnIfWeakModel(ollamaModel);
      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel,
        messages: [
          { role: 'system', content: QUIZ_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.7, num_predict: 2048 },
      }, 600000);

      const content = result.message?.content || '';
      console.log('[AIStudy] 📝 Raw quiz response (first 200 chars):', content.substring(0, 200));
      const parsed = parseResponse(content);
      if (parsed && parsed.questions) return { success: true, questions: parsed.questions };
      console.error('[AIStudy] ❌ Could not parse quiz JSON from model output.');
      return { success: false, error: 'Khong the parse quiz tu Ollama' };
    }
  } catch (error) {
    if (!error.message.includes('ECONNREFUSED')) {
      console.error('[AIStudy] Generate quiz error:', error.message);
    }
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

