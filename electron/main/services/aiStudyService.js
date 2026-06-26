/* ===== AI Study Service — Ollama & Gemini =====
   Handles AI chat for study planning, plan generation, and quiz generation.
*/

import http from 'node:http';
import https from 'node:https';
import { loadStudySettings } from './studyPlannerStore.js';

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const OLLAMA_MODEL = 'qwen3:14b';
const GEMINI_MODELS = [
  'gemini-flash-latest', 
  'gemini-flash-lite-latest', 
  'gemini-2.5-flash', 
  'gemini-2.5-flash-lite', 
  'gemini-2.0-flash', 
  'gemini-2.0-flash-lite'
];

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

async function geminiRequest(apiKey, body, timeoutMs = 120000, modelIndex = 0, retryCount = 0) {
  if (modelIndex >= GEMINI_MODELS.length) {
    throw new Error('All Gemini models are currently experiencing high demand. Please try again later.');
  }
  
  const currentModel = GEMINI_MODELS[modelIndex];
  const urlStr = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(urlStr, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    
    // We can parse the text first so we know exactly what we got
    const textData = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(textData);
    } catch(err) {
      throw new Error(`Parse error: ${textData.substring(0, 200)}`);
    }

    if (parsed.error) {
      // Check for high demand error, not found, or limit:0
      const isOverloaded = parsed.error.code === 503 || String(parsed.error.message).includes('high demand');
      const isNotFound = parsed.error.code === 404 || String(parsed.error.message).includes('is not found');
      const isLimitZero = String(parsed.error.message).includes('limit: 0');

      if (isOverloaded || isNotFound || isLimitZero) {
        console.log(`[AIStudy] Model ${currentModel} is unavailable (Overloaded/NotFound/Limit 0), falling back to next...`);
        return await geminiRequest(apiKey, body, timeoutMs, modelIndex + 1, 0);
      }

      // Check for Rate Limit (Quota exceeded)
      if (parsed.error.code === 429 || String(parsed.error.message).includes('Quota exceeded')) {
        if (retryCount < 2) { // Max 2 retries per model
          const match = String(parsed.error.message).match(/retry in ([\d\.]+)s/);
          let waitSecs = 15; // Default 15 seconds wait
          if (match && match[1]) {
            waitSecs = parseFloat(match[1]) + 1; // Add 1 second buffer
          }
          console.log(`[AIStudy] Rate limit hit on ${currentModel}. Retrying in ${waitSecs.toFixed(1)}s (Retry ${retryCount + 1}/2)...`);
          await new Promise(r => setTimeout(r, waitSecs * 1000));
          return await geminiRequest(apiKey, body, timeoutMs, modelIndex, retryCount + 1);
        } else {
          console.log(`[AIStudy] Model ${currentModel} rate limited after retries, falling back to next...`);
          return await geminiRequest(apiKey, body, timeoutMs, modelIndex + 1, 0);
        }
      }
    }
    
    return parsed;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// ===== System Prompts =====

const CHAT_SYSTEM_PROMPT = `Ban la tro ly tu van hoc tap AI. Thu thap thong tin tu nguoi dung de tao ke hoach hoc tap.
NGON NGU: Mac dinh Tieng Viet.
BAN CAN THU THAP: 1.Linh vuc 2.Chu de cu the 3.Trinh do 4.Muc tieu 5.Thoi gian du kien 6.Thoi gian hoc/ngay
QUY TAC: Hoi tu nhien. Neu user cung cap du (it nhat 1,2,3) thi readyToGenerate=true. Ngan gon 3-4 cau.
OUTPUT JSON (khong markdown): {"reply":"...","collectedInfo":{"subject":"","topic":"","level":"","goal":"","totalDuration":"","dailyHours":""},"readyToGenerate":false}
Khi readyToGenerate=true, reply them: "Toi da co du thong tin. Ban co muon tao ke hoach hoc tap khong?"`;

const PLAN_SYSTEM_PROMPT = `Tao ke hoach hoc tap JSON. KHONG giai thich, CHI tra ve JSON.
Format: {"title":"...","description":"...","phases":[{"id":1,"name":"...","duration":"...","description":"...","topics":["..."],"resources":[{"name":"...","url":"https://...","type":"website"}],"completed":false}]}
Tao 4-5 phases, 2-3 topics/phase, 1-2 resources/phase. Ngan gon.`;

const QUIZ_SYSTEM_PROMPT = `Tao 10 cau hoi trac nghiem JSON. KHONG giai thich, CHI tra ve JSON.
Format: {"questions":[{"id":1,"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A"}]}
10 cau, 4 dap an A/B/C/D.`;

// ===== Helpers =====
async function getConfig() {
  const settingsResult = loadStudySettings();
  if (settingsResult.success && settingsResult.data) {
    return settingsResult.data; // { aiProvider, geminiKey }
  }
  return { aiProvider: 'ollama', geminiKey: '' };
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
    const config = await getConfig();

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      // --- GEMINI FLOW ---
      const geminiBody = {
        system_instruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
        contents: formatGeminiMessages(messages),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      };

      const result = await geminiRequest(config.geminiKey, geminiBody);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseResponse(content);
      if (parsed) {
        return {
          success: true,
          reply: parsed.reply || content,
          collectedInfo: parsed.collectedInfo || {},
          readyToGenerate: parsed.readyToGenerate || false,
        };
      }
      return { success: true, reply: content, collectedInfo: {}, readyToGenerate: false };

    } else {
      // --- OLLAMA FLOW ---
      const ollamaMessages = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];

      const result = await ollamaRequest('/api/chat', {
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
        options: { temperature: 0.7, num_predict: 512 },
      });

      const content = result.message?.content || '';
      const parsed = parseResponse(content);
      if (parsed) {
        return {
          success: true,
          reply: parsed.reply || content,
          collectedInfo: parsed.collectedInfo || {},
          readyToGenerate: parsed.readyToGenerate || false,
        };
      }
      return { success: true, reply: content, collectedInfo: {}, readyToGenerate: false };
    }
  } catch (error) {
    console.error('[AIStudy] Chat error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function generateStudyPlan(collectedInfo) {
  try {
    const config = await getConfig();
    const userPrompt = `Tao ke hoach hoc tap:
- Linh vuc: ${collectedInfo.subject || 'Chua ro'}
- Chu de: ${collectedInfo.topic || 'Chua ro'}
- Trinh do: ${collectedInfo.level || 'Moi bat dau'}
- Muc tieu: ${collectedInfo.goal || 'Chua ro'}
- Thoi gian: ${collectedInfo.totalDuration || 'Linh hoat'}
- Hoc/ngay: ${collectedInfo.dailyHours || 'Linh hoat'}
CHI TRA VE JSON.`;

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      // --- GEMINI FLOW ---
      const geminiBody = {
        system_instruction: { parts: [{ text: PLAN_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        }
      };

      const result = await geminiRequest(config.geminiKey, geminiBody, 60000); // 1m for Gemini
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      return { success: false, error: 'Khong the parse ke hoach tu Gemini' };

    } else {
      // --- OLLAMA FLOW ---
      const result = await ollamaRequest('/api/chat', {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: PLAN_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.6, num_predict: 2048 },
      }, 600000); // 10 min timeout

      const content = result.message?.content || '';
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      return { success: false, error: 'Khong the parse ke hoach tu Ollama' };
    }
  } catch (error) {
    console.error('[AIStudy] Generate plan error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function generateQuiz(phase, planTitle) {
  try {
    const config = await getConfig();
    const userPrompt = `Tao 10 cau hoi trac nghiem ve: ${phase.name}
Chu de: ${(phase.topics || []).join(', ')}
CHI TRA VE JSON.`;

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      // --- GEMINI FLOW ---
      const geminiBody = {
        system_instruction: { parts: [{ text: QUIZ_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      };

      const result = await geminiRequest(config.geminiKey, geminiBody, 60000);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseResponse(content);
      if (parsed && parsed.questions) return { success: true, questions: parsed.questions };
      return { success: false, error: 'Khong the parse quiz tu Gemini' };

    } else {
      // --- OLLAMA FLOW ---
      const result = await ollamaRequest('/api/chat', {
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: QUIZ_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.7, num_predict: 2048 },
      }, 600000);

      const content = result.message?.content || '';
      const parsed = parseResponse(content);
      if (parsed && parsed.questions) return { success: true, questions: parsed.questions };
      return { success: false, error: 'Khong the parse quiz tu Ollama' };
    }
  } catch (error) {
    console.error('[AIStudy] Generate quiz error:', error.message);
    return { success: false, error: error.message };
  }
}
