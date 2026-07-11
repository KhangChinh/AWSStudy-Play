

const GEMINI_MODELS = [
  'gemini-flash-latest', 
  'gemini-flash-lite-latest', 
  'gemini-2.5-flash', 
  'gemini-2.5-flash-lite', 
  'gemini-2.0-flash', 
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
];

/**
 * Robust Gemini Request with fallback and retry logic.
 * @param {string} apiKey 
 * @param {object} body - Request body for Gemini API
 * @param {string} preferredModel - The model the user selected (tried first)
 * @param {number} timeoutMs 
 * @param {string[]} fallbackChain - Internal list of models to try
 * @param {number} retryCount 
 * @returns 
 */
export async function geminiRequestWithFallback(apiKey, body, preferredModel = 'gemini-1.5-flash', timeoutMs = 120000, fallbackChain = null, retryCount = 0) {
  // Initialize fallback chain on first call
  if (!fallbackChain) {
    // Put preferred model first, then add the rest of the available models (excluding the preferred one to avoid duplicates)
    fallbackChain = [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)];
  }

  if (fallbackChain.length === 0) {
    throw new Error('All Gemini models are currently experiencing high demand or are unavailable. Please try again later.');
  }
  
  const currentModel = fallbackChain[0];
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
    
    const textData = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(textData);
    } catch(err) {
      throw new Error(`Parse error: ${textData.substring(0, 200)}`);
    }

    if (parsed.error) {
      const isOverloaded = parsed.error.code === 503 || String(parsed.error.message).includes('high demand');
      const isNotFound = parsed.error.code === 404 || String(parsed.error.message).includes('is not found');
      const isLimitZero = String(parsed.error.message).includes('limit: 0');

      if (isOverloaded || isNotFound || isLimitZero) {
        console.log(`[Gemini API] Model ${currentModel} is unavailable (Overloaded/NotFound/Limit 0), falling back to next...`);
        // Remove current model from chain and try next
        return await geminiRequestWithFallback(apiKey, body, preferredModel, timeoutMs, fallbackChain.slice(1), 0);
      }

      // Check for Rate Limit (Quota exceeded)
      if (parsed.error.code === 429 || String(parsed.error.message).includes('Quota exceeded')) {
        if (retryCount < 2) {
          const match = String(parsed.error.message).match(/retry in ([\d\.]+)s/);
          let waitSecs = 15;
          if (match && match[1]) {
            waitSecs = parseFloat(match[1]) + 1;
          }
          console.log(`[Gemini API] Rate limit hit on ${currentModel}. Retrying in ${waitSecs.toFixed(1)}s (Retry ${retryCount + 1}/2)...`);
          await new Promise(r => setTimeout(r, waitSecs * 1000));
          return await geminiRequestWithFallback(apiKey, body, preferredModel, timeoutMs, fallbackChain, retryCount + 1);
        } else {
          console.log(`[Gemini API] Model ${currentModel} rate limited after retries, falling back to next...`);
          return await geminiRequestWithFallback(apiKey, body, preferredModel, timeoutMs, fallbackChain.slice(1), 0);
        }
      }
      
      // Other errors
      throw new Error(parsed.error.message || 'Unknown Gemini Error');
    }
    
    return parsed;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[Gemini API] Model ${currentModel} timed out, falling back to next...`);
      return await geminiRequestWithFallback(apiKey, body, preferredModel, timeoutMs, fallbackChain.slice(1), 0);
    }
    throw error;
  }
}
