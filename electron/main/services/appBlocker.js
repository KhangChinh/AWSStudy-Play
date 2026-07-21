/* ===== App Blocker Service =====
   Phân loại native Windows apps (.exe) có nên bị chặn trong Focus Mode.

   Flow:
   1. AI Cache check (theo processName, 24h TTL)
   2. Cache miss + in-flight guard → lấy Windows metadata (PowerShell VersionInfo) → gửi AI
   3. Cache kết quả 24h

   Note: Background services bị lọc trước ở focusEngine.js bằng
   PowerShell MainWindowHandle != 0 — chỉ app user mở mới đến đây.
*/

import { exec } from 'node:child_process';
import { getAiSettingsFromStore } from './sharedStore.js';
import { geminiRequestWithFallback } from './geminiApi.js';
import { bedrockConverse } from './bedrockApi.js';
import http from 'node:http';
import https from 'node:https';

// ===== AI Cache =====
const appCache = new Map(); // key: processName (lowercase, no .exe)
const APP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 giờ

// In-flight deduplication: tránh gọi AI 2 lần song song cho cùng 1 process
const inFlightChecks = new Set();

// ===== AI Prompt =====
const APP_SYSTEM_PROMPT = `You are an app usage filter for a productivity/study application.
Your job is to decide if a running Windows application should be BLOCKED during a focus study session.

TASK: Classify the app as "ALLOW" or "BLOCK".

RULES:
1. ALLOW: Productivity tools, code editors, development software, office apps, communication tools (chat/email), study tools, system utilities, and any work-related software, record tools.
2. BLOCK: Video games (any genre), game launchers, music/video streaming apps (Spotify, VLC, Netflix, etc.), entertainment platforms, and anything whose primary purpose is entertainment or leisure.
3. UNCLEAR: If unsure, lean towards ALLOW for professional-sounding software, BLOCK for entertainment.

INPUT: You will receive the app's process name, file description, product name, and company name from Windows.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. No markdown, no extra text.
{"result": "ALLOW" or "BLOCK", "reason": "Short explanation in English (max 15 words)"}`;

function buildAppPrompt(metadata) {
  let prompt = `Classify the following Windows application:\n`;
  prompt += `- Process Name: ${metadata.processName || 'N/A'}\n`;
  if (metadata.fileDescription) prompt += `- File Description: ${metadata.fileDescription}\n`;
  if (metadata.productName) prompt += `- Product Name: ${metadata.productName}\n`;
  if (metadata.companyName) prompt += `- Company Name: ${metadata.companyName}\n`;
  if (metadata.fileName) prompt += `- File Name: ${metadata.fileName}\n`;
  return prompt;
}

// ===== Parse AI Response =====
function parseAppAiResponse(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*?"result"\s*:\s*"(ALLOW|BLOCK)"[\s\S]*?\}/i);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { result: parsed.result.toUpperCase(), reason: parsed.reason || '' };
    }
  } catch { /* fall through */ }

  const upper = text.toUpperCase();
  if (upper.includes('ALLOW')) return { result: 'ALLOW', reason: text.substring(0, 80) };
  if (upper.includes('BLOCK')) return { result: 'BLOCK', reason: text.substring(0, 80) };
  return { result: 'ALLOW', reason: 'Could not parse AI response — defaulting ALLOW' };
}

// ===== HTTP Helper (reuse pattern từ aiGuard) =====
function httpRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const mod = isHttps ? https : http;
    const bodyString = body ? JSON.stringify(body) : null;
    const headers = { ...options.headers };
    if (bodyString) headers['Content-Length'] = Buffer.byteLength(bodyString);

    const req = mod.request(url, {
      method: options.method || 'GET',
      headers,
      timeout: options.timeout || 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (bodyString) req.write(bodyString);
    req.end();
  });
}

// ===== Lấy Windows Metadata bằng PowerShell =====
/**
 * Lấy FileDescription, ProductName, CompanyName từ .exe thông qua VersionInfo.
 * @param {string} processName - tên process không có .exe
 * @returns {Promise<{ fileDescription, productName, companyName, path }>}
 */
export function getWindowsAppMetadata(processName) {
  return new Promise((resolve) => {
    // Lấy đường dẫn process rồi đọc VersionInfo
    const psCmd = `
      try {
        $p = Get-Process -Name '${processName}' -ErrorAction Stop | Select-Object -First 1;
        $path = $p.Path;
        if ($path) {
          $vi = (Get-Item $path -ErrorAction Stop).VersionInfo;
          Write-Output ($vi | Select-Object FileDescription, ProductName, CompanyName, OriginalFilename | ConvertTo-Json -Compress)
        } else {
          Write-Output '{}'
        }
      } catch {
        Write-Output '{}'
      }
    `.trim().replace(/\n\s+/g, ' ');

    exec(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 8000 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        return resolve({ fileDescription: '', productName: '', companyName: '', fileName: '' });
      }
      try {
        const info = JSON.parse(stdout.trim());
        resolve({
          fileDescription: info.FileDescription || '',
          productName: info.ProductName || '',
          companyName: info.CompanyName || '',
          fileName: info.OriginalFilename || '',
        });
      } catch {
        resolve({ fileDescription: '', productName: '', companyName: '', fileName: '' });
      }
    });
  });
}

// ===== AI Classification =====
/**
 * Gửi metadata lên AI để phân loại app.
 * Cascade theo thứ tự: Bedrock → Gemini → Ollama
 * Mỗi provider đều được thử nếu provider trước thất bại.
 * @param {object} metadata - { processName, fileDescription, productName, companyName }
 * @returns {{ result: 'ALLOW'|'BLOCK', reason: string, provider: string }}
 */
export async function classifyApp(metadata) {
  const settings = getAiSettingsFromStore()?.blocker || {};
  const userPrompt = buildAppPrompt(metadata);

  // 1. AWS Bedrock — thử trước nếu provider = 'bedrock'
  if (settings.provider === 'bedrock') {
    try {
      const bedrockRes = await bedrockConverse({
        systemPrompt: APP_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 256,
        timeoutMs: 30000,
      });
      const parsed = parseAppAiResponse(bedrockRes.text);
      console.log(`[AppBlocker] ⚡ Bedrock result: ${parsed.result} — ${parsed.reason}`);
      return { ...parsed, provider: 'bedrock' };
    } catch (e) {
      console.warn('[AppBlocker] Bedrock failed, trying Gemini:', e.message);
    }
  }

  // 2. Gemini — thử nếu provider = 'gemini' hoặc Bedrock vừa fail
  if (settings.provider === 'gemini' || settings.provider === 'bedrock') {
    if (settings.apiKey || settings.geminiApiKey) {
      try {
        const apiKey = settings.apiKey || settings.geminiApiKey;
        let model = settings.selectedModel || settings.model || 'gemini-2.0-flash';
        // Safety: nếu model name không phải gemini (vd user để lầm Ollama model)
        if (!model.startsWith('gemini')) model = 'gemini-2.0-flash';
        const body = {
          system_instruction: { parts: [{ text: APP_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.1 }
        };
        const resp = await geminiRequestWithFallback(apiKey, body, model, 30000);
        const text = resp.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = parseAppAiResponse(text);
        console.log(`[AppBlocker] ⚡ Gemini result: ${parsed.result} — ${parsed.reason}`);
        return { ...parsed, provider: 'gemini' };
      } catch (e) {
        console.warn('[AppBlocker] Gemini failed, trying Ollama:', e.message);
      }
    }
  }

  // 3. Ollama — thử bất kể provider nào (local, luôn sẵn sàng nếu đang chạy)
  if (settings.ollamaModel || settings.model) {
    const ollamaModel = settings.ollamaModel || settings.model;
    try {
      const res = await httpRequest('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }, {
        model: ollamaModel,
        messages: [
          { role: 'system', content: APP_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: { temperature: 0.1 }
      });
      if (res.status === 200 && res.data?.message) {
        const parsed = parseAppAiResponse(res.data.message.content);
        console.log(`[AppBlocker] ⚡ Ollama result: ${parsed.result} — ${parsed.reason}`);
        return { ...parsed, provider: 'ollama' };
      }
    } catch (e) {
      console.warn('[AppBlocker] Ollama failed:', e.message);
    }
  }

  // Không có provider nào → mặc định ALLOW (app lạ → không chặn oan)
  return { result: 'ALLOW', reason: 'No AI provider available', provider: 'none' };
}


// ===== Public API =====

/**
 * Lấy kết quả phân loại cho app (có cache 24h).
 * Background services đã được lọc trước bằng MainWindowHandle != 0.
 * @param {string} processName
 * @returns {{ result: 'ALLOW'|'BLOCK', reason, provider, productName, fromCache }}
 */
export async function getAppVerdict(processName) {
  const key = processName.toLowerCase().replace('.exe', '');

  // Hardcoded Whitelist
  if (key === 'discord' || key.includes('obs')) {
    return { result: 'ALLOW', reason: 'Hardcoded whitelist', provider: 'system', productName: key, fromCache: true };
  }

  // Check cache 24h
  const cached = appCache.get(key);
  if (cached && Date.now() - cached.timestamp < APP_CACHE_TTL) {
    return { ...cached.result, fromCache: true };
  }

  // In-flight deduplication
  if (inFlightChecks.has(key)) {
    return { result: 'ALLOW', reason: 'AI check in progress', provider: 'pending', fromCache: false };
  }

  inFlightChecks.add(key);
  try {
    console.log(`\n[AppBlocker] 🧠 Classifying app: "${key}"...`);
    const metadata = await getWindowsAppMetadata(key);
    const aiResult = await classifyApp({ processName: key, ...metadata });

    const fullResult = {
      ...aiResult,
      productName: metadata.productName || metadata.fileDescription || key,
      fromCache: false,
    };

    appCache.set(key, { result: fullResult, timestamp: Date.now() });
    console.log(`[AppBlocker] 📝 Verdict for "${key}" (${fullResult.productName}) → ${aiResult.result} (via ${aiResult.provider})`);

    return fullResult;
  } finally {
    inFlightChecks.delete(key);
  }
}

/**
 * Xóa cache AI (dùng khi cần reset giữa phiên).
 */
export function clearAppCache() {
  appCache.clear();
  inFlightChecks.clear();
}
