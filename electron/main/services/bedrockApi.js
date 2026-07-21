/**
 * bedrockApi.js
 * Gọi Amazon Bedrock Converse API với AWS Signature V4 (không cần AWS SDK)
 * Credentials được load từ .env — người dùng chỉ cần toggle ON, không cần nhập key.
 */
import https from 'node:https';
import crypto from 'node:crypto';

let cognitoCredentials = null;
let crossAccountCredentialsCache = null;
let crossAccountCredentialsExpiry = 0;

export function setCognitoCredentials(creds) {
  cognitoCredentials = creds;
  crossAccountCredentialsCache = null; // Invalidate cross account cache if root credentials change
}

// Target Role ARN in Account B (Hardcoded for this architecture)
const CROSS_ACCOUNT_ROLE_ARN = 'arn:aws:iam::804838452777:role/CrossAccountBedrockRole';

async function getAssumedRoleCredentials() {
  if (crossAccountCredentialsCache && Date.now() < crossAccountCredentialsExpiry) {
    return crossAccountCredentialsCache;
  }
  
  if (!cognitoCredentials) {
    return null; // Fallback to process.env if no cognito credentials
  }

  const host = 'sts.amazonaws.com';
  const path = '/';
  const method = 'POST';
  const region = 'us-east-1';
  const service = 'sts';
  const contentType = 'application/x-www-form-urlencoded';
  
  const body = `Action=AssumeRole&Version=2011-06-15&RoleArn=${encodeURIComponent(CROSS_ACCOUNT_ROLE_ARN)}&RoleSessionName=BedrockSession`;
  
  const { authorization, amzDate } = buildAuthHeader({
    accessKey: cognitoCredentials.accessKeyId,
    secretKey: cognitoCredentials.secretAccessKey,
    sessionToken: cognitoCredentials.sessionToken,
    region,
    host,
    method,
    path,
    body,
    service,
    contentType
  });
  
  return new Promise((resolve, reject) => {
    const postData = Buffer.from(body, 'utf-8');
    const headers = {
      'Content-Type': contentType,
      'Content-Length': postData.length,
      'X-Amz-Date': amzDate,
      'Authorization': authorization,
    };
    if (cognitoCredentials.sessionToken) {
      headers['X-Amz-Security-Token'] = cognitoCredentials.sessionToken;
    }
    
    const req = https.request({
      hostname: host,
      path,
      method,
      headers,
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`[STS] Error ${res.statusCode}: ${data}`));
          return;
        }
        
        const accessKeyMatch = data.match(/<AccessKeyId>(.*?)<\/AccessKeyId>/);
        const secretKeyMatch = data.match(/<SecretAccessKey>(.*?)<\/SecretAccessKey>/);
        const sessionTokenMatch = data.match(/<SessionToken>(.*?)<\/SessionToken>/);
        const expirationMatch = data.match(/<Expiration>(.*?)<\/Expiration>/);
        
        if (accessKeyMatch && secretKeyMatch && sessionTokenMatch) {
          crossAccountCredentialsCache = {
            accessKeyId: accessKeyMatch[1],
            secretAccessKey: secretKeyMatch[1],
            sessionToken: sessionTokenMatch[1]
          };
          
          if (expirationMatch) {
            crossAccountCredentialsExpiry = new Date(expirationMatch[1]).getTime() - 5 * 60000;
          } else {
            crossAccountCredentialsExpiry = Date.now() + 55 * 60000;
          }
          
          console.log('[AWS STS] Successfully assumed cross-account Bedrock role');
          resolve(crossAccountCredentialsCache);
        } else {
          reject(new Error('[STS] Failed to parse AssumeRole response'));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('[STS] Timeout')); });
    req.write(postData);
    req.end();
  });
}

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
function buildAuthHeader({ accessKey, secretKey, sessionToken, region, host, method, path, body, service = 'bedrock', contentType = 'application/json' }) {
  const now      = new Date();
  const amzDate  = formatDate(now);
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = hash(body);

  let canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
    
  let signedHeaders = 'content-type;host;x-amz-date';
  
  if (sessionToken) {
    canonicalHeaders += `x-amz-security-token:${sessionToken}\n`;
    signedHeaders += ';x-amz-security-token';
  }

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

function bedrockHttpRequest({ host, path, body, authorization, amzDate, sessionToken, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    const postData = Buffer.from(body, 'utf-8');
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      'X-Amz-Date': amzDate,
      'Authorization': authorization,
    };
    if (sessionToken) {
      headers['X-Amz-Security-Token'] = sessionToken;
    }
    
    const req = https.request({
      hostname: host,
      path,
      method: 'POST',
      headers,
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
  accessKey  = null,
  secretKey  = null,
  sessionToken = null,
  region     = process.env.BEDROCK_REGION || 'us-east-1',
  modelId    = process.env.BEDROCK_MODEL || 'amazon.nova-lite-v1:0',
  systemPrompt = '',
  messages = [],
  maxTokens = 1024,
  timeoutMs = 120000,
  retryCount = 0,
}) {

  // Auto-resolve credentials via STS or Env
  if (!accessKey || !secretKey) {
    try {
      const crossCreds = await getAssumedRoleCredentials();
      if (crossCreds) {
        accessKey = crossCreds.accessKeyId;
        secretKey = crossCreds.secretAccessKey;
        sessionToken = crossCreds.sessionToken;
      } else {
        accessKey = process.env.BEDROCK_ACCESS_KEY;
        secretKey = process.env.BEDROCK_SECRET_KEY;
      }
    } catch (err) {
      console.error('[Bedrock STS Error]', err);
    }
  }

  if (!accessKey || !secretKey) {
    throw new Error('[Bedrock] Credentials chưa được cấu hình. (Cần Cognito hoặc file .env)');
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

  const requestBody = JSON.stringify(bodyObj);
  const { authorization, amzDate } = buildAuthHeader({
    accessKey,
    secretKey,
    sessionToken,
    region,
    host,
    method: 'POST',
    path,
    body: requestBody
  });

  try {
    const result = await bedrockHttpRequest({
      host,
      path,
      body: requestBody,
      authorization,
      amzDate,
      sessionToken,
      timeoutMs
    });

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

