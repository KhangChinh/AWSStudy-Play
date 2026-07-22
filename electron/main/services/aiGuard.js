/* ===== AI Guard — Full AI Classification Service =====
   ESM module. Handles Ollama (local) and Groq (cloud) LLM connections
   for Tier 2 video classification.
   Ported from focus-frontend/ai-service.js
*/
import http from 'node:http';
import https from 'node:https';
import { geminiRequestWithFallback } from './geminiApi.js';
import { bedrockConverse } from './bedrockApi.js';
import { getAiSettingsFromStore } from './sharedStore.js';

function getBlockerAiSettings() {
  return getAiSettingsFromStore()?.blocker || null;
}

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
let OLLAMA_MODEL = 'qwen3:14b'; // can be updated via setBlockerModel()
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Allow external code to update the blocker model from AI Settings
export function setBlockerModel(modelName) {
  if (modelName && typeof modelName === 'string') {
    OLLAMA_MODEL = modelName;
    console.log(`[AI] Blocker model updated to: ${OLLAMA_MODEL}`);
  }
}

// ===== In-Memory Settings =====
let memorySettings = {
  // Only truly safe categories bypass AI title analysis (Tier 2).
  // Everything else (Sports, Howto, People & Blogs, etc.) goes to AI to check the actual title.
  allowedCategories: ['Education', 'Science & Technology'],
  groqApiKey: ''
};

// ===== Classification Cache =====
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ===== Classification Prompt =====
const SYSTEM_PROMPT = `You are a YouTube content filter for a productivity application. 
Your objective is to ALLOW productive, educational, and tutorial content, and BLOCK purely entertainment content.

TASK: Classify the video as "ALLOW" or "BLOCK".

RULES:
1. ALLOW: Academic subjects, coding/software development, project building, DIY, tutorials (including sports, art, cooking, how-to), documentaries, and informative news.
2. BLOCK: Gaming, Music videos (even "study music"), Movies, Anime, Comedy, Vlogs, Drama, ASMR, and general entertainment (celebrity gossip, memes).
3. STRICT BLOCK ON FICTION/READING: Videos about novels, fiction, manga, webtoons, or comic summaries MUST BE BLOCKED.
4. AMBIGUITY: If a video seems to teach a skill or provide useful information, ALLOW it. If it is purely for wasting time, BLOCK it.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. Do not include markdown code blocks, explanations, or any extra text.
{"result": "ALLOW" or "BLOCK", "reason": "Short explanation in English (max 20 words)"}`;

function buildUserPrompt(metadata) {
  let prompt = `Classify the following YouTube video:\n`;
  prompt += `- Title: ${metadata.title || 'N/A'}\n`;
  prompt += `- Channel/Author: ${metadata.author || 'N/A'}\n`;
  prompt += `- YouTube Category: ${metadata.category || 'N/A'}\n`;
  if (metadata.keywords && metadata.keywords.length > 0) {
    prompt += `- Keywords: ${metadata.keywords.slice(0, 10).join(', ')}\n`;
  }
  if (metadata.description) {
    let desc = metadata.description.replace(/\s+/g, ' ').trim();
    prompt += `- Description: ${desc.substring(0, 300)}\n`;
  }
  return prompt;
}

// ===== HTTP Helpers =====
function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const mod = isHttps ? https : http;
    const bodyString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const headers = { ...options.headers };
    if (bodyString) {
      headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = mod.request(url, {
      method: options.method || 'GET',
      headers: headers,
      timeout: options.timeout || 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (e) => {
      if (!options.silent) {
        console.error('[AI] HTTP error:', e.message);
      }
      reject(e);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });

    if (bodyString) req.write(bodyString);
    req.end();
  });
}

// ===== Ollama =====
async function checkOllama() {
  try {
    const res = await httpRequest(`${OLLAMA_BASE}/api/tags`, { method: 'GET', timeout: 5000, silent: true });
    if (res.status === 200 && res.data && res.data.models) {
      const hasModel = res.data.models.some(m => m.name && m.name.startsWith('qwen3'));
      return { available: true, hasModel, models: res.data.models.map(m => m.name) };
    }
    return { available: false, hasModel: false, models: [] };
  } catch (e) {
    return { available: false, hasModel: false, models: [] };
  }
}

async function classifyWithOllama(metadata, promptTemplate) {
  const userPrompt = buildUserPrompt(metadata);
  const res = await httpRequest(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000 // 2 minutes (local models take time to load)
  }, {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: promptTemplate || SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    stream: false,
    options: { temperature: 0.1 }
  });

  if (res.status === 200 && res.data && res.data.message) {
    return parseAiResponse(res.data.message.content);
  }
  throw new Error(`Ollama error: ${res.status}`);
}

async function classifyWithGemini(metadata, apiKey, modelName, promptTemplate) {
  const userPrompt = buildUserPrompt(metadata);
  const body = {
    system_instruction: { parts: [{ text: promptTemplate || SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      
      temperature: 0.1,
    }
  };
  const responseObj = await geminiRequestWithFallback(apiKey, body, modelName, 60000);
  const responseText = responseObj.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseAiResponse(responseText);
}

// ===== Groq =====
async function checkGroq() {
  const key = getGroqKey();
  if (!key) return { available: false, reason: 'no_key' };

  try {
    const res = await httpRequest(`${GROQ_BASE}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${key}` },
      timeout: 5000,
      silent: true
    });
    if (res.status === 200) return { available: true };
    if (res.status === 401) return { available: false, reason: 'invalid_key' };
    return { available: false, reason: `http_${res.status}` };
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

async function classifyWithGroq(metadata) {
  const key = getGroqKey();
  if (!key) throw new Error('No Groq API key');

  const userPrompt = buildUserPrompt(metadata);
  const res = await httpRequest(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    timeout: 15000
  }, {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    max_tokens: 150
  });

  if (res.status === 200 && res.data && res.data.choices && res.data.choices[0]) {
    return parseAiResponse(res.data.choices[0].message.content);
  }
  throw new Error(`Groq error: ${res.status}`);
}

// ===== Unified API =====
function parseAiResponse(text) {
  try {
    // Try to extract JSON from the response (handles markdown code blocks too)
    const jsonMatch = text.match(/\{[\s\S]*?"result"\s*:\s*"(ALLOW|BLOCK)"[\s\S]*?\}/i);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        result: parsed.result.toUpperCase(),
        reason: parsed.reason || ''
      };
    }
  } catch { /* fall through */ }

  // Fallback: look for ALLOW/BLOCK keywords
  const upper = text.toUpperCase();
  if (upper.includes('ALLOW')) return { result: 'ALLOW', reason: text.substring(0, 100) };
  if (upper.includes('BLOCK')) return { result: 'BLOCK', reason: text.substring(0, 100) };

  // Default to BLOCK if cannot parse
  return { result: 'BLOCK', reason: 'Could not parse AI response' };
}

/**
 * Classify video content using Ollama (primary) then Groq (fallback).
 * This is named classifyContent to match what focusEngine.js imports.
 * @param {object} metadata - Video metadata
 * @returns {{ result: string, reason: string, provider: string }}
 */
export async function classifyContent(metadata) {
  const key = metadata.videoId || metadata.url || metadata.title || '';

  // Check cache first
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, cached: true };
  }

  let result;
  const blockerConfig = getBlockerAiSettings() || { provider: 'bedrock' };

  if (blockerConfig.provider === 'bedrock') {
    // Try Bedrock
    try {
      const bedrockModel = process.env.BEDROCK_MODEL || blockerConfig.selectedModel || 'amazon.nova-lite-v1:0';
      console.log(`[AI] 🔍 Classifying video with Bedrock | Model: ${bedrockModel} | Title: "${metadata.title || 'N/A'}"`);
      const userPrompt = buildUserPrompt(metadata);
      const bedrockRes = await bedrockConverse({
        systemPrompt: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1024
      });
      const parsed = parseAiResponse(bedrockRes.text);
      const usage = bedrockRes.usage || { inputTokens: 0, outputTokens: 0 };
      console.log(`[AI] ✅ Bedrock result: ${parsed.result} — ${parsed.reason} (Tokens: In=${usage.inputTokens}, Out=${usage.outputTokens})`);
      result = { ...parsed, provider: 'bedrock' };
    } catch (e) {
      console.warn('[AI] Bedrock classification failed:', e.message);
    }
  } else if (blockerConfig.provider === 'gemini' && blockerConfig.apiKey) {
    // Try Gemini
    try {
      let geminiModel = blockerConfig.selectedModel || 'gemini-2.0-flash';
      // Safety check: if user switched to Gemini but UI retained an Ollama model name (e.g. qwen)
      if (!geminiModel.startsWith('gemini')) {
        geminiModel = 'gemini-2.0-flash';
      }
      console.log(`[AI] 🔍 Classifying video with Gemini | Model: ${geminiModel} | Title: "${metadata.title || 'N/A'}"`);
      const geminiResultObj = await classifyWithGemini(metadata, blockerConfig.apiKey, geminiModel, SYSTEM_PROMPT);
      console.log(`[AI] ✅ Gemini result: ${geminiResultObj.result} — ${geminiResultObj.reason}`);
      result = { ...geminiResultObj, provider: 'gemini' };
    } catch (e) {
      console.warn('[AI] Gemini classification failed:', e.message);
    }
  } else {
    // Try Ollama
    try {
      const ollama = await checkOllama();
      if (ollama.available && ollama.hasModel) {
        console.log(`[AI] 🔍 Classifying video with Ollama | Model: ${OLLAMA_MODEL} | Title: "${metadata.title || 'N/A'}"`);
        const ollamaResult = await classifyWithOllama(metadata, SYSTEM_PROMPT);
        console.log(`[AI] ✅ Ollama result: ${ollamaResult.result} — ${ollamaResult.reason}`);
        result = { ...ollamaResult, provider: 'bedrock' };
      }
    } catch (e) {
      console.warn('[AI] Ollama classification failed:', e.message);
    }
  }

  // Fallback to Groq
  if (!result) {
    try {
      const groq = await checkGroq();
      if (groq.available) {
        console.log(`[AI] 🔍 Classifying video with Groq | Model: ${GROQ_MODEL}`);
        const groqResult = await classifyWithGroq(metadata);
        console.log(`[AI] ✅ Groq result: ${groqResult.result} — ${groqResult.reason}`);
        result = { ...groqResult, provider: 'groq' };
      }
    } catch (e) {
      console.warn('[AI] Groq classification failed:', e.message);
    }
  }

  // No AI available → default BLOCK
  if (!result) {
    result = { result: 'BLOCK', reason: 'No AI provider available', provider: 'none' };
  }

  // Save to cache
  cache.set(key, { result, timestamp: Date.now() });

  return result;
}

// ===== Web Page Classification =====
const WEB_SYSTEM_PROMPT = `You are a strict web content filter for a student productivity application.
Your ONLY task is to ALLOW strictly educational/work-related websites and BLOCK absolutely everything else.

CLASSIFY as "ALLOW" or "BLOCK" based on the page metadata provided.

ALLOW ONLY:
- Educational platforms, online courses, technical tutorials
- Technical documentation, reference materials, wikis
- Programming tools, code repositories, IDEs
- Research papers, academic journals
- Productivity tools (calendar, notes, project management)

BLOCK EVERYTHING ELSE (Examples):
- Novel, fiction, light novel, and story reading sites (e.g., etruyen, wattpad)
- Comic, manga, webtoon reading sites
- Gaming sites, game wikis, game forums
- Streaming sites (movies, anime, TV shows)
- Social media platforms, forums (unless strictly for coding/tech)
- Meme, humor, news, sports, shopping sites

IMPORTANT RULES:
1. EXCLUSIVE ALLOW: If the site is NOT clearly teaching a hard skill, academic topic, or providing a productivity tool, you MUST classify it as "BLOCK".
2. CRITICAL BLOCK - FICTION: Novels, fiction, literature, comics, manga, webtoons are STRICTLY FORBIDDEN. Even if they claim to be "reading" or "literature", they are entertainment and MUST BE BLOCKED.
3. AMBIGUITY: If ambiguous or metadata is insufficient, default to "BLOCK". Do NOT assume a site is educational without clear proof.

OUTPUT: Respond ONLY with valid JSON. No markdown, no explanation outside JSON.
{"result": "ALLOW" or "BLOCK", "reason": "Short reason in English (max 15 words)"}`;

const webCache = new Map();
const WEB_CACHE_TTL = 24 * 60 * 60 * 1000;

function buildWebUserPrompt(metadata) {
  let prompt = `Classify the following web page:\n`;
  prompt += `- URL: ${metadata.url || 'N/A'}\n`;
  prompt += `- Domain: ${metadata.domain || 'N/A'}\n`;
  prompt += `- Page Title: ${metadata.title || 'N/A'}\n`;
  if (metadata.description) {
    prompt += `- Meta Description: ${metadata.description.substring(0, 300)}\n`;
  }
  if (metadata.ogTitle) {
    prompt += `- OG Title: ${metadata.ogTitle}\n`;
  }
  if (metadata.ogDescription) {
    prompt += `- OG Description: ${metadata.ogDescription.substring(0, 200)}\n`;
  }
  if (metadata.keywords) {
    prompt += `- Keywords: ${metadata.keywords.substring(0, 200)}\n`;
  }
  if (metadata.h1) {
    prompt += `- H1: ${metadata.h1.substring(0, 100)}\n`;
  }
  return prompt;
}

async function classifyWebWithOllama(metadata) {
  const userPrompt = buildWebUserPrompt(metadata);
  const res = await httpRequest(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000
  }, {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: WEB_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    stream: false,
    options: { temperature: 0.1 }
  });

  if (res.status === 200 && res.data && res.data.message) {
    return parseAiResponse(res.data.message.content);
  }
  throw new Error(`Ollama error: ${res.status}`);
}

async function classifyWebWithGroq(metadata) {
  const key = getGroqKey();
  if (!key) throw new Error('No Groq API key');

  const userPrompt = buildWebUserPrompt(metadata);
  const res = await httpRequest(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    timeout: 15000
  }, {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: WEB_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    max_tokens: 150
  });

  if (res.status === 200 && res.data && res.data.choices && res.data.choices[0]) {
    return parseAiResponse(res.data.choices[0].message.content);
  }
  throw new Error(`Groq error: ${res.status}`);
}

/**
 * Classify a general web page using AI.
 * Cache by domain to avoid repeated calls for same site.
 * @param {object} metadata - { url, domain, title, description, ... }
 * @returns {{ result: string, reason: string, provider: string }}
 */
export async function classifyWebPage(metadata) {
  const cacheKey = metadata.domain || metadata.url || '';

  // Check domain cache
  const cached = webCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEB_CACHE_TTL) {
    return { ...cached.result, cached: true };
  }

  let result;
  const blockerConfig = getBlockerAiSettings() || { provider: 'bedrock' };

  if (blockerConfig.provider === 'bedrock') {
    // Try Bedrock
    try {
      const bedrockModel = process.env.BEDROCK_MODEL || blockerConfig.selectedModel || 'amazon.nova-lite-v1:0';
      console.log(`[AI-Web] 🔍 Classifying web page with Bedrock | Model: ${bedrockModel} | Domain: ${metadata.domain}`);
      const userPrompt = buildWebUserPrompt(metadata);
      const bedrockRes = await bedrockConverse({
        systemPrompt: WEB_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1024
      });
      const parsed = parseAiResponse(bedrockRes.text);
      const usage = bedrockRes.usage || { inputTokens: 0, outputTokens: 0 };
      console.log(`[AI-Web] ✅ Bedrock result: ${parsed.result} — ${parsed.reason} (Tokens: In=${usage.inputTokens}, Out=${usage.outputTokens})`);
      result = { ...parsed, provider: 'bedrock' };
    } catch (e) {
      console.warn('[AI-Web] Bedrock classification failed:', e.message);
    }
  } else if (blockerConfig.provider === 'gemini' && blockerConfig.apiKey) {
    // Try Gemini
    try {
      let geminiModel = blockerConfig.selectedModel || 'gemini-2.0-flash';
      // Safety check: if user switched to Gemini but UI retained an Ollama model name
      if (!geminiModel.startsWith('gemini')) {
        geminiModel = 'gemini-2.0-flash';
      }
      console.log(`[AI-Web] 🔍 Classifying web page with Gemini | Model: ${geminiModel} | Domain: ${metadata.domain}`);
      const body = {
        system_instruction: { parts: [{ text: WEB_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildWebUserPrompt(metadata) }] }],
        generationConfig: {
          
          temperature: 0.1,
        }
      };
      const responseObj = await geminiRequestWithFallback(blockerConfig.apiKey, body, geminiModel, 60000);
      const responseText = responseObj.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const geminiResultObj = parseAiResponse(responseText);
      console.log(`[AI-Web] ✅ Gemini result: ${geminiResultObj.result} — ${geminiResultObj.reason}`);
      result = { ...geminiResultObj, provider: 'gemini' };
    } catch (e) {
      console.warn('[AI-Web] Gemini classification failed:', e.message);
    }
  } else {
    // Try Ollama
    try {
      const ollama = await checkOllama();
      if (ollama.available && ollama.hasModel) {
        console.log(`[AI-Web] 🔍 Classifying web page with Ollama | Model: ${OLLAMA_MODEL} | Domain: ${metadata.domain}`);
        const ollamaResult = await classifyWebWithOllama(metadata);
        console.log(`[AI-Web] ✅ Ollama result: ${ollamaResult.result} — ${ollamaResult.reason}`);
        result = { ...ollamaResult, provider: 'bedrock' };
      }
    } catch (e) {
      console.warn('[AI-Web] Ollama failed:', e.message);
    }
  }

  // Fallback to Groq
  if (!result) {
    try {
      const groq = await checkGroq();
      if (groq.available) {
        console.log(`[AI-Web] 🔍 Classifying web page with Groq | Model: ${GROQ_MODEL} | Domain: ${metadata.domain}`);
        const groqResult = await classifyWebWithGroq(metadata);
        console.log(`[AI-Web] ✅ Groq result: ${groqResult.result} — ${groqResult.reason}`);
        result = { ...groqResult, provider: 'groq' };
      }
    } catch (e) {
      console.warn('[AI-Web] Groq failed:', e.message);
    }
  }

  if (!result) {
    result = { result: 'BLOCK', reason: 'No AI provider available', provider: 'none' };
  }

  // Cache by domain
  webCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

/**
 * Clear the classification cache.
 * @returns {{ success: boolean, clearedCount: number }}
 */
export function clearCache() {
  const count = cache.size + webCache.size;
  cache.clear();
  webCache.clear();
  return { success: true, clearedCount: count };
}

/**
 * Get current AI provider status.
 * @returns {{ gemini: object, ollama: object, groq: object, activeProvider: string, ready: boolean }}
 */
export async function getAiStatus() {
  const blockerConfig = getBlockerAiSettings();
  const gemini = {
    available: !!(blockerConfig?.provider === 'gemini' && blockerConfig?.apiKey),
    model: blockerConfig?.selectedModel || 'gemini-2.0-flash'
  };
  const bedrock = {
    available: !!(blockerConfig?.provider === 'bedrock'),
    model: process.env.BEDROCK_MODEL || blockerConfig?.selectedModel || 'amazon.nova-lite-v1:0'
  };

  const [ollama, groq] = await Promise.all([checkOllama(), checkGroq()]);
  
  let activeProvider = 'none';
  if (bedrock.available) {
    activeProvider = 'bedrock';
  } else if (gemini.available) {
    activeProvider = 'gemini';
  } else if (ollama.available && ollama.hasModel) {
    activeProvider = 'ollama';
  } else if (groq.available) {
    activeProvider = 'groq';
  }

  return {
    bedrock,
    gemini,
    ollama,
    groq,
    activeProvider,
    ready: activeProvider !== 'none'
  };
}

// ===== Settings =====
export function getAllowedCategories() {
  return memorySettings.allowedCategories;
}

export function saveAllowedCategories(cats) {
  memorySettings.allowedCategories = cats;
}

export function getGroqKey() {
  return memorySettings.groqApiKey;
}

export function saveGroqKey(key) {
  memorySettings.groqApiKey = key;
}
