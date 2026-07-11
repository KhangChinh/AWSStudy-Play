/* ===== AI Study Service — Ollama & Gemini =====
   Handles AI chat for study planning, plan generation, and quiz generation.
*/

import http from 'node:http';
import https from 'node:https';
import { loadStudySettings } from './studyPlannerStore.js';
import { geminiRequestWithFallback } from './geminiApi.js';

// Models known to be too small to reliably output JSON
const WEAK_MODELS = ['qwen2.5:1.5b', 'tinyllama', 'phi3:mini', 'phi:mini', 'gemma:2b', 'orca-mini'];

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

// Load AI settings from the main electron-store (saved by storeIpc aiSettings)
async function getAiSettings() {
  try {
    // studyPlannerStore settings (legacy: aiProvider + geminiKey)
    const settingsResult = loadStudySettings();
    const legacy = (settingsResult.success && settingsResult.data) ? settingsResult.data : {};
    return {
      aiProvider: legacy.aiProvider || 'ollama',
      geminiKey: legacy.geminiKey || '',
      selectedModel: legacy.selectedModel || OLLAMA_MODEL_DEFAULT,
    };
  } catch {
    return { aiProvider: 'ollama', geminiKey: '', selectedModel: OLLAMA_MODEL_DEFAULT };
  }
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

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      let geminiModel = config.selectedModel || 'gemini-1.5-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-1.5-flash';
      console.log(`[AIStudy] 🤖 Chat → Provider: Gemini (Cloud) | Preferred Model: ${geminiModel}`);
      // --- GEMINI FLOW ---
      const geminiBody = {
        system_instruction: { parts: [{ text: CHAT_SYSTEM_PROMPT }] },
        contents: formatGeminiMessages(messages),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      };

      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 120000);
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
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] 🤖 Chat → Provider: Ollama (Local) | Model: ${ollamaModel}`);
      warnIfWeakModel(ollamaModel);
      // --- OLLAMA FLOW ---
      const ollamaMessages = [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];

      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel,
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
    if (!error.message.includes('ECONNREFUSED')) {
      console.error('[AIStudy] Chat error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

export async function generateStudyPlan(collectedInfo) {
  try {
    const config = await getAiSettings();
    const userPrompt = `Tao ke hoach hoc tap:
- Linh vuc: ${collectedInfo.subject || 'Chua ro'}
- Chu de: ${collectedInfo.topic || 'Chua ro'}
- Trinh do: ${collectedInfo.level || 'Moi bat dau'}
- Muc tieu: ${collectedInfo.goal || 'Chua ro'}
- Thoi gian: ${collectedInfo.totalDuration || 'Linh hoat'}
- Hoc/ngay: ${collectedInfo.dailyHours || 'Linh hoat'}
CHI TRA VE JSON.`;

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      let geminiModel = config.selectedModel || 'gemini-1.5-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-1.5-flash';
      console.log(`[AIStudy] 📋 Generate Plan → Provider: Gemini (Cloud) | Preferred Model: ${geminiModel}`);
      // --- GEMINI FLOW ---
      const geminiBody = {
        system_instruction: { parts: [{ text: PLAN_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        }
      };

      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 60000); // 1m for Gemini
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      return { success: false, error: 'Khong the parse ke hoach tu Gemini' };

    } else {
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] 📋 Generate Plan → Provider: Ollama (Local) | Model: ${ollamaModel}`);
      warnIfWeakModel(ollamaModel);
      // --- OLLAMA FLOW ---
      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel,
        messages: [
          { role: 'system', content: PLAN_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.6, num_predict: 2048 },
      }, 600000); // 10 min timeout

      const content = result.message?.content || '';
      console.log('[AIStudy] 📋 Raw plan response (first 200 chars):', content.substring(0, 200));
      const plan = parseResponse(content);
      if (plan) return { success: true, plan };
      console.error('[AIStudy] ❌ Could not parse plan JSON from model output.');
      return { success: false, error: 'Khong the parse ke hoach tu Ollama' };
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
    const userPrompt = `Tao 10 cau hoi trac nghiem ve: ${phase.name}
Chu de: ${(phase.topics || []).join(', ')}
CHI TRA VE JSON.`;

    if (config.aiProvider === 'gemini' && config.geminiKey) {
      let geminiModel = config.selectedModel || 'gemini-1.5-flash';
      if (!geminiModel.startsWith('gemini')) geminiModel = 'gemini-1.5-flash';
      console.log(`[AIStudy] 📝 Generate Quiz → Provider: Gemini (Cloud) | Preferred Model: ${geminiModel}`);
      // --- GEMINI FLOW ---
      const geminiBody = {
        system_instruction: { parts: [{ text: QUIZ_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      };

      const result = await geminiRequestWithFallback(config.geminiKey, geminiBody, geminiModel, 60000);
      if (result.error) throw new Error(result.error.message || 'Gemini API Error');
      
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseResponse(content);
      if (parsed && parsed.questions) return { success: true, questions: parsed.questions };
      return { success: false, error: 'Khong the parse quiz tu Gemini' };

    } else {
      const ollamaModel = config.selectedModel || OLLAMA_MODEL_DEFAULT;
      console.log(`[AIStudy] 📝 Generate Quiz → Provider: Ollama (Local) | Model: ${ollamaModel}`);
      warnIfWeakModel(ollamaModel);
      // --- OLLAMA FLOW ---
      const result = await ollamaRequest('/api/chat', {
        model: ollamaModel,
        messages: [
          { role: 'system', content: QUIZ_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
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
