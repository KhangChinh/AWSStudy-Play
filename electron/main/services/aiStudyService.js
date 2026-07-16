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

const CHAT_SYSTEM_PROMPT = `Ban la tro ly tu van hoc tap AI. Thu thap thong tin tu nguoi dung de tao ke hoach hoc tap.
NGON NGU YEU CAU: Ban CHI ho tro tieng Anh va tieng Viet. Hay tra loi bang ngon ngu ma nguoi dung dang su dung (uu tien tieng Viet). NEU nguoi dung dung ngon ngu khac (VD: tieng Trung, Nhat, Han, Phap...), HAY TU CHOI ho tro va yeu cau ho su dung tieng Anh hoac tieng Viet.
BAN CAN THU THAP: 1.Linh vuc 2.Chu de cu the 3.Trinh do 4.Muc tieu 5.Thoi gian du kien 6.Thoi gian hoc/ngay
QUY TAC: Hoi tu nhien. Neu user cung cap du (it nhat 1,2,3) thi readyToGenerate=true. Ngan gon 3-4 cau.
OUTPUT JSON (khong markdown): {"reply":"...","collectedInfo":{"subject":"","topic":"","level":"","goal":"","totalDuration":"","dailyHours":""},"readyToGenerate":false}
Khi readyToGenerate=true, reply them bang ngon ngu hien tai: "Toi da co du thong tin. Ban co muon tao ke hoach hoc tap khong?"`;

const PLAN_SYSTEM_PROMPT = `Tao ke hoach hoc tap JSON. KHONG giai thich, CHI tra ve JSON.
NGON NGU: Bat buoc phai dong bo voi ngon ngu ma nguoi dung da chat (thuong la tieng Viet hoac tieng Anh).
Format: {"title":"...","description":"...","phases":[{"id":1,"name":"...","duration":"...","description":"...","topics":["..."],"resources":[{"name":"...","url":"https://...","type":"website"}],"completed":false}]}
Tao 4-5 phases, 2-3 topics/phase, 1-2 resources/phase. Ngan gon.`;

const QUIZ_SYSTEM_PROMPT = `Tao 10 cau hoi trac nghiem JSON. KHONG giai thich, CHI tra ve JSON.
NGON NGU: Bắt buộc đồng bộ theo ngôn ngữ của Kế hoạch học tập hoặc chủ đề được truyền vào.
Format: {"questions":[{"id":1,"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A"}]}
10 cau, 4 dap an A/B/C/D.`;

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
      finalSystemPrompt += `\n\nNẾU USER HỎI VỀ BÀI HỌC/KIẾN THỨC, HÃY DỰA VÀO TÀI LIỆU SAU ĐỂ TRẢ LỜI. NẾU USER CHỈ CHAT CHÀO HỎI THÌ KHÔNG CẦN DÙNG.\n\n${docContext.summaryBlock}\n\n${docContext.chunksBlock}`;
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
        ollamaSystemPrompt += `\n\nTÀI LIỆU ĐÍNH KÈM (tóm tắt ngắn): ${shortSummary}`;
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
    
    let userPrompt = `Tao ke hoach hoc tap:
- Linh vuc: ${collectedInfo.subject || 'Chua ro'}
- Chu de: ${collectedInfo.topic || 'Chua ro'}
- Trinh do: ${collectedInfo.level || 'Moi bat dau'}
- Muc tieu: ${collectedInfo.goal || 'Chua ro'}
- Thoi gian: ${collectedInfo.totalDuration || 'Linh hoat'}
- Hoc/ngay: ${collectedInfo.dailyHours || 'Linh hoat'}`;

    if (docContext) {
      userPrompt += `\n\n=== TÀI LIỆU ĐÍNH KÈM ===\nTên tài liệu: ${docContext.fileName}\nTóm tắt: ${docContext.summary}\nCác chủ đề: ${docContext.topics.join(', ')}\nCấu trúc tài liệu:\n${docContext.structureBlock}\n\nYÊU CẦU ĐẶC BIỆT: Hãy tạo các phases bám sát Cấu trúc tài liệu này. Đảm bảo Kế hoạch học tập phản ánh chính xác nội dung tài liệu.`;
    }
    
    userPrompt += `\nCHI TRA VE JSON.`;

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
    
    let userPrompt = `Bối cảnh: Kế hoạch học tập "${planTitle}"
Tạo 10 câu hỏi trắc nghiệm về giai đoạn: ${phase.name}
Chủ đề cần tập trung: ${(phase.topics || []).join(', ')}`;

    if (docContext) {
      userPrompt += `\n\n=== NỘI DUNG TỪ TÀI LIỆU (${docContext.fileName}) ===\n${docContext.contentBlock}\n\nYÊU CẦU: Tạo câu hỏi bám sát 100% nội dung tài liệu này. Không bịa đặt kiến thức ngoài tài liệu.`;
    }

    userPrompt += `\nCHI TRA VE JSON.`;

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

