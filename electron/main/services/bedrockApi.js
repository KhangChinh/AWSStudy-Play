/**
 * bedrockApi.js
 * Gọi Amazon Bedrock Converse API với AWS Signature V4 (không cần AWS SDK)
 * Credentials được load từ .env — người dùng chỉ cần toggle ON, không cần nhập key.
 */
import https from 'node:https';
import crypto from 'node:crypto';

// ===== AWS Signature V4 =====


function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest();
}

function hash(string) {
  return crypto.createHash('sha256').update(string, 'utf8').digest('hex');
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate    = hmac('AWS4' + secretKey, dateStamp);
  const kRegion  = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

function formatDate(d) {
  return d.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
}

/**
 * Tạo Authorization header dùng AWS Signature V4
 */
function buildAuthHeader({ accessKey, secretKey, region, host, method, path, body }) {
  const now      = new Date();
  const amzDate  = formatDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const service  = 'bedrock';

  const payloadHash = hash(body);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-date';

  // Theo chuẩn AWS SigV4, Canonical URI phải encode URI từng segment một lần nữa.
  // Vì modelId đã được encode một lần (%3A), khi encode lại nó sẽ thành %253A, khớp với AWS.
  const canonicalUri = path.split('/').map(segment => encodeURIComponent(segment)).join('/');

  const canonicalRequest = [
    method,
    canonicalUri,
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');


  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature  = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, amzDate };
}

// ===== Core Request =====

function bedrockHttpRequest({ host, path, body, authorization, amzDate, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    const postData = Buffer.from(body, 'utf-8');
    const req = https.request({
      hostname: host,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'X-Amz-Date': amzDate,
        'Authorization': authorization,
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            const msg = parsed?.message || parsed?.Message || `HTTP ${res.statusCode}`;
            reject(new Error(`[Bedrock] ${msg}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`[Bedrock] Parse error: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('[Bedrock] Request timeout')); });
    req.write(postData);
    req.end();
  });
}

// ===== Public API =====

/**
 * bedrockConverse — gửi messages theo Converse API format
 * @param {object} opts
 * @param {string} opts.accessKey
 * @param {string} opts.secretKey
 * @param {string} opts.region
 * @param {string} opts.modelId
 * @param {string} opts.systemPrompt
 * @param {Array}  opts.messages   - [{ role: 'user'|'assistant', content: 'text' }]
 * @param {number} opts.maxTokens
 * @param {number} opts.timeoutMs
 * @returns {{ text: string, usage: object }}
 */
export async function bedrockConverse({
  accessKey  = process.env.BEDROCK_ACCESS_KEY,
  secretKey  = process.env.BEDROCK_SECRET_KEY,
  region     = process.env.BEDROCK_REGION || 'us-east-1',
  modelId    = process.env.BEDROCK_MODEL || 'amazon.nova-lite-v1:0',
  systemPrompt = '',
  messages = [],
  maxTokens = 1024,
  timeoutMs = 120000,
  retryCount = 0,
}) {

  if (!accessKey || !secretKey) {
    throw new Error('[Bedrock] Credentials chưa được cấu hình. Kiểm tra file .env (BEDROCK_ACCESS_KEY / BEDROCK_SECRET_KEY).');
  }
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const path = `/model/${encodeURIComponent(modelId)}/converse`;

  // Build Converse API body
  const bedrockMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: [{ text: String(m.content) }],
  }));

  const bodyObj = {
    messages: bedrockMessages,
    inferenceConfig: { maxTokens },
  };

  if (systemPrompt) {
    bodyObj.system = [{ text: systemPrompt }];
  }

  const bodyStr = JSON.stringify(bodyObj);
  const { authorization, amzDate } = buildAuthHeader({
    accessKey, secretKey, region,
    host, method: 'POST', path, body: bodyStr,
  });

  try {
    const result = await bedrockHttpRequest({ host, path, body: bodyStr, authorization, amzDate, timeoutMs });

    const text = result?.output?.message?.content?.[0]?.text || '';
    const usage = result?.usage || {};

    console.log(`[BedrockAPI] ${modelId} OK — in:${usage.inputTokens} out:${usage.outputTokens}`);
    return { text, usage };
  } catch (error) {
    const errMsg = error.message.toLowerCase();
    const isThrottled = errMsg.includes('throttling') || errMsg.includes('429') || errMsg.includes('too many requests');
    const isOverloaded = errMsg.includes('503') || errMsg.includes('service unavailable');
    
    if ((isThrottled || isOverloaded) && retryCount < 2) {
      const waitSecs = isThrottled ? 15 : 10;
      console.log(`[BedrockAPI] Model ${modelId} hit rate limit / overloaded. Retrying in ${waitSecs}s (Retry ${retryCount + 1}/2)...`);
      await new Promise(r => setTimeout(r, waitSecs * 1000));
      return await bedrockConverse({ accessKey, secretKey, region, modelId, systemPrompt, messages, maxTokens, timeoutMs, retryCount: retryCount + 1 });
    }
    throw error;
  }
}

