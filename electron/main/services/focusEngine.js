/* ===== Focus Engine — Full Focus Mode with WebSocket, Timer, Strike System =====
   ESM module. Ported from focus-frontend/main.js.
   
   Features:
   - WebSocket server (port 8765) for browser extension communication
   - Extension gate check (tasklist every 3s)
   - Timer with countdown
   - Process killer for blacklisted apps
   - Strike system (3 strikes = session failed)
   - Session API calls (startSession, recordStrike, endSession)
   - AI classification via WebSocket
   - AI status polling during active timer
*/

import { WebSocketServer } from 'ws';
import { exec } from 'node:child_process';
import { classifyContent, classifyWebPage, clearCache, getAiStatus, getAllowedCategories, saveAllowedCategories, getGroqKey, saveGroqKey } from './aiGuard.js';
import { startSession, recordStrike, endSession } from './sessionApi.js';

// ===== State =====
let win = null;          // BrowserWindow reference, set via setFocusWin()
let authToken = '';      // Auth token from Cognito, set via setAuthToken()
let userId = '';         // User ID, set via setUserId()

let focusMode = false;
let strikeCount = 0;
let currentSessionId = null;

const WS_PORT = 8765;
const clients = new Set();
const connectedBrowsers = new Map(); // ws -> browser name
const disconnectedGrace = new Map(); // browser -> { timeout, timestamp }
let isAppBlocked = false; // Only true when browsers running WITHOUT extension
let isAiReady = false;
let noBrowserRunning = true; // true = no browsers open, focus allowed
let missingBrowsersList = [];
let missingSince = new Map();

const BLACKLISTED_APPS = ['facebook.exe', 'twitter.exe', 'x.exe', 'tiktok.exe', 'threads.exe', 'instagram.exe'];

// ===== Timer & Hard Mode State =====
let timerState = {
  active: false,
  hardMode: false,
  endTime: 0,
  remaining: 0,
  paused: false,
  totalMinutes: 0
};
let timerInterval = null;

// ===== Setter functions =====
export function setFocusWin(browserWindow) {
  win = browserWindow;
}

export function setUserId(id) {
  userId = id;
}

export function setAuthToken(token) {
  authToken = token;
}

// ===== Helper: send to renderer =====
function sendToRenderer(channel, ...args) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

// ===== Timer =====
function startTimerTick() {
  clearInterval(timerInterval);
  timerInterval = setInterval(async () => {
    if (!timerState.active || timerState.paused) return;
    const now = Date.now();

    if (now >= timerState.endTime) {
      // Timer expired! Immediately mark inactive to prevent re-entry
      timerState.active = false;
      timerState.hardMode = false;
      timerState.paused = false;
      clearInterval(timerInterval);

      console.log('[Timer] Session complete!');

      // End session via AWS API
      if (currentSessionId) {
        try {
          const result = await endSession(authToken, { sessionId: currentSessionId });
          console.log(`[AWS] Session ended: ${result.status}`);
          if (result.questUpdate) {
            console.log('[Quest] Quest progress updated from timer complete');
            sendToRenderer('quest-updated', result.questUpdate);
          }
        } catch (e) {
          console.error('[AWS] Failed to end session:', e.message);
        }
      }

      focusMode = false;
      strikeCount = 0;
      currentSessionId = null;
      broadcastToClients(null);
      sendToRenderer('focus-mode-changed', focusMode);
      sendToRenderer('timer-expired');
    }
  }, 1000);
}

function getTimerStatus() {
  if (!timerState.active) return { active: false };
  let remaining;
  if (timerState.paused) {
    remaining = timerState.remaining;
  } else {
    remaining = Math.max(0, timerState.endTime - Date.now());
  }
  return {
    active: true,
    hardMode: timerState.hardMode,
    paused: timerState.paused,
    remaining,
    totalMinutes: timerState.totalMinutes,
    strikeCount
  };
}

async function stopTimerForcefully() {
  if (!timerState.active) return;
  console.log('[Timer] Forcefully stopping timer.');

  // End session via AWS API
  if (currentSessionId) {
    try {
      const result = await endSession(authToken, { sessionId: currentSessionId });
      console.log(`[AWS] Session ended: ${result.status}`);
      if (result.questUpdate) {
        console.log('[Quest] Quest progress updated from stop');
        sendToRenderer('quest-updated', result.questUpdate);
      }
    } catch (e) {
      console.error('[AWS] Failed to end session:', e.message);
    }
  }

  timerState.active = false;
  timerState.hardMode = false;
  timerState.paused = false;
  clearInterval(timerInterval);
  focusMode = false;
  strikeCount = 0;
  currentSessionId = null;
  broadcastToClients(null);
  sendToRenderer('focus-mode-changed', focusMode);
  sendToRenderer('timer-expired');
}

// ===== Process Monitoring =====
function getRunningBrowsers() {
  return new Promise(resolve => {
    exec('tasklist /NH /FO CSV', (err, stdout) => {
      if (err) return resolve(new Set());
      const out = stdout.toLowerCase();

      // Native App Killer — kill blacklisted apps during active timer
      if (timerState.active) {
        for (const app of BLACKLISTED_APPS) {
          if (out.includes(app)) {
            exec(`taskkill /F /IM ${app}`, (kErr) => {
              if (!kErr) {
                console.log(`[FocusGuard] Enforced App Block: Killed ${app}`);
                if (authToken && currentSessionId && timerState.hardMode) {
                  recordStrike(authToken, {
                    sessionId: currentSessionId,
                    type: 'APP_VIOLATION',
                    reason: `Mở ứng dụng bị cấm: ${app}`
                  }).then(res => {
                    if (res && res.strikeCount) {
                      strikeCount = res.strikeCount;
                      sendToRenderer('strike-recorded', { strikeCount });
                      if (strikeCount >= 3) {
                        endSessionFail();
                      }
                    }
                  }).catch(e => console.error('[AWS] Failed to record strike for app:', e.message));
                } else if (!timerState.hardMode) {
                  strikeCount++;
                  sendToRenderer('strike-recorded', { strikeCount });
                  if (strikeCount >= 3) {
                    endSessionFail();
                  }
                }
              }
            });
          }
        }
      }

      const hasBrowser = out.includes('chrome.exe') || out.includes('msedge.exe') || 
                         out.includes('opera.exe') || out.includes('brave.exe') || 
                         out.includes('firefox.exe') || out.includes('browser.exe');
      
      if (!hasBrowser) {
        return resolve(new Set());
      }

      // If a browser is running, check if it has a visible window (MainWindowHandle != 0)
      // This ignores background "ghost" processes like Edge Startup Boost
      const psCommand = `Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName -match '^(chrome|msedge|opera|brave|firefox|browser)$' } | Select-Object -ExpandProperty ProcessName`;
      
      exec(`powershell -NoProfile -Command "${psCommand}"`, (errPs, stdoutPs) => {
        const running = new Set();
        if (!stdoutPs) return resolve(running); // Empty output means no visible browsers
        
        const outPs = stdoutPs.toLowerCase();
        if (outPs.includes('chrome')) running.add('chrome');
        if (outPs.includes('msedge')) running.add('edge');
        if (outPs.includes('opera')) running.add('opera');
        if (outPs.includes('brave')) running.add('brave');
        if (outPs.includes('firefox')) running.add('firefox');
        if (outPs.includes('browser')) running.add('coccoc');
        
        resolve(running);
      });
    });
  });
}

function endSessionFail() {
  timerState.active = false;
  timerState.hardMode = false;
  timerState.paused = false;
  clearInterval(timerInterval);
  focusMode = false;
  sendToRenderer('session-failed');
  broadcastToClients(null);
  
  if (currentSessionId && authToken) {
    endSession(authToken, { sessionId: currentSessionId }).catch(() => {});
  }
}

// ===== Extension Gate Check =====
async function checkGateStatus() {
  const running = await getRunningBrowsers();
  const connected = new Set(Array.from(connectedBrowsers.values()));

  for (const browserName of disconnectedGrace.keys()) {
    connected.add(browserName);
  }

  const currentlyMissing = [];
  for (const b of running) {
    if (!connected.has(b)) currentlyMissing.push(b);
  }

  // Allow a 10-second grace period for extensions to boot and connect
  const now = Date.now();
  const definitelyMissing = [];
  for (const b of currentlyMissing) {
    if (!missingSince.has(b)) {
      missingSince.set(b, now);
    } else {
      if (now - missingSince.get(b) > 10000) {
        definitelyMissing.push(b);
      }
    }
  }

  // Clean up map for browsers that are no longer missing
  for (const b of missingSince.keys()) {
    if (!currentlyMissing.includes(b)) {
      missingSince.delete(b);
    }
  }

  // Determine gate validity
  let valid;
  if (running.size === 0) {
    valid = true; // No browsers running → OK, user studies with books
    noBrowserRunning = true;
  } else {
    valid = definitelyMissing.length === 0; // All open browsers have extension
    noBrowserRunning = false;
  }

  isAppBlocked = !valid;
  missingBrowsersList = definitelyMissing;

  // Auto-disable focus mode if unguarded browser detected DURING active timer
  if (isAppBlocked && focusMode) {
    if (timerState.active) {
      console.log('[FocusGuard] Detected unguarded browser during timer. Force stopping timer.');
      stopTimerForcefully();
    } else {
      console.log('[FocusGuard] Detected unguarded browser. Auto-disabling focus mode.');
      focusMode = false;
      broadcastToClients(null);
      sendToRenderer('focus-mode-changed', focusMode);
    }
  }

  sendToRenderer('gate-status', {
    blocked: isAppBlocked,
    missing: missingBrowsersList,
    connected: Array.from(connected),
    noBrowserRunning
  });
}

// Gate check every 3 seconds
setInterval(checkGateStatus, 3000);

// ===== Background AI Polling (runs only when timer is active) =====
setInterval(async () => {
  if (timerState.active) {
    const status = await getAiStatus();
    isAiReady = status.ready;
    if (!status.ready) {
      console.log('[AI] AI connection lost during active timer! Force stopping timer.');
      stopTimerForcefully();
      sendToRenderer('ai-status-lost');
    }
  }
}, 5000);

// ===== WebSocket Server =====
let wss;
try {
  wss = new WebSocketServer({ port: WS_PORT }, () => {
    console.log(`[FocusGuard] WebSocket server on ws://localhost:${WS_PORT}`);
  });
  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[FocusGuard] Port ${WS_PORT} already in use.`);
    } else {
      console.error('[FocusGuard] WS Error:', err.message);
    }
  });
} catch (e) {
  console.error('[FocusGuard] WS Failed:', e.message);
}

setInterval(() => {
  if (!wss) return;
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'PING' }));
  });
}, 10000);

if (wss) {
wss.on('connection', (ws) => {
  console.log('[FocusGuard] Extension connected');
  clients.add(ws);

  ws.send(JSON.stringify({ type: 'FOCUS_MODE_CHANGED', enabled: focusMode }));

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'PONG') return;

      // Extension identification
      if (data.type === 'EXTENSION_CONNECTED') {
        const browserName = data.browser || 'unknown';
        connectedBrowsers.set(ws, browserName);
        console.log(`[FocusGuard] Extension identified as: ${browserName}`);
        
        if (disconnectedGrace.has(browserName)) {
          clearTimeout(disconnectedGrace.get(browserName).timeout);
          disconnectedGrace.delete(browserName);
        }
        
        checkGateStatus();
        ws.send(JSON.stringify({
          type: 'SETTINGS_UPDATED',
          allowedCategories: getAllowedCategories()
        }));
        ws.send(JSON.stringify({
          type: 'FOCUS_MODE_CHANGED',
          enabled: focusMode
        }));
      }

      // Focus mode change from extension
      if (data.type === 'FOCUS_MODE_CHANGED') {
        focusMode = data.enabled;
        broadcastToClients(ws);
        sendToRenderer('focus-mode-changed', focusMode);
      }

      // Tier 2: AI classification request from Extension
      if (data.type === 'CLASSIFY_VIDEO' && data.metadata) {
        console.log('[AI] Classification request for:', data.metadata.title);
        sendToRenderer('ai-classifying', true);
        try {
          const result = await classifyContent(data.metadata);
          console.log('[AI] Result:', result);
          ws.send(JSON.stringify({
            type: 'CLASSIFY_RESULT',
            videoId: data.metadata.videoId,
            result: result.result,
            reason: result.reason,
            provider: result.provider
          }));
        } catch (e) {
          console.error('[AI] Classification error:', e);
          ws.send(JSON.stringify({
            type: 'CLASSIFY_RESULT',
            videoId: data.metadata.videoId,
            result: 'BLOCK',
            reason: 'AI error: ' + e.message,
            provider: 'error'
          }));
        }
        sendToRenderer('ai-classifying', false);
      }

      // ===== CLASSIFY_PAGE: AI classification for general web pages =====
      if (data.type === 'CLASSIFY_PAGE' && data.metadata) {
        console.log('[AI-Web] Classification request for:', data.metadata.domain);
        sendToRenderer('ai-classifying', true);
        try {
          const result = await classifyWebPage(data.metadata);
          console.log('[AI-Web] Result:', result);
          ws.send(JSON.stringify({
            type: 'CLASSIFY_PAGE_RESULT',
            domain: data.metadata.domain,
            url: data.metadata.url,
            result: result.result,
            reason: result.reason,
            provider: result.provider
          }));
        } catch (e) {
          console.error('[AI-Web] Classification error:', e);
          ws.send(JSON.stringify({
            type: 'CLASSIFY_PAGE_RESULT',
            domain: data.metadata.domain,
            url: data.metadata.url,
            result: 'BLOCK',
            reason: 'AI error: ' + e.message,
            provider: 'error'
          }));
        }
        sendToRenderer('ai-classifying', false);
      }

      // ===== STRIKE_REPORT from Extension =====
      if (data.type === 'STRIKE_REPORT') {
        console.log('[Strike] STRIKE_REPORT received:', data.videoTitle);
        strikeCount++;
        console.log(`[Strike] Strike count: ${strikeCount}/3`);

        // Record strike via AWS API
        if (currentSessionId) {
          try {
            const strikeRes = await recordStrike(authToken, {
              sessionId: currentSessionId
            });
            console.log(`[AWS] Strike recorded: ${strikeRes.strikeCount}/3`);
            if (strikeRes.sessionEnded) {
              console.log('[AWS] Server auto-ended session due to 3 strikes');
            }
          } catch (e) {
            console.error('[AWS] Failed to record strike:', e.message);
          }
        }

        // Notify renderer of strike
        sendToRenderer('strike-recorded', {
          strikeCount,
          videoTitle: data.videoTitle || 'Unknown',
          reason: data.reason || ''
        });

        // 3 strikes = FAILED
        if (strikeCount >= 3) {
          console.log('[Strike] 3 strikes reached! Session FAILED.');
          sendToRenderer('session-failed', { strikeCount });
          await stopTimerForcefully();
        }
      }
    } catch (e) { console.error('[FocusGuard] Parse error:', e); }
  });

  ws.on('close', () => {
    clients.delete(ws);
    const browserName = connectedBrowsers.get(ws);
    connectedBrowsers.delete(ws);
    console.log(`[FocusGuard] Extension disconnected (${browserName || 'unknown'})`);

    if (browserName) {
      const graceTimeout = setTimeout(() => {
        disconnectedGrace.delete(browserName);
        const stillConnected = Array.from(connectedBrowsers.values()).includes(browserName);
        if (!stillConnected) checkGateStatus();
      }, 15000);
      disconnectedGrace.set(browserName, { timeout: graceTimeout, timestamp: Date.now() });
    }
  });
});
}

// ===== Broadcast helpers =====
function broadcastToClients(exclude) {
  const msg = JSON.stringify({ type: 'FOCUS_MODE_CHANGED', enabled: focusMode });
  clients.forEach(c => { if (c !== exclude && c.readyState === 1) c.send(msg); });
}

function broadcastSettings(exclude) {
  const msg = JSON.stringify({
    type: 'SETTINGS_UPDATED',
    allowedCategories: getAllowedCategories()
  });
  clients.forEach(c => { if (c !== exclude && c.readyState === 1) c.send(msg); });
}

// ===== Exported API =====

/**
 * Start a focus session with timer.
 * @param {{ minutes: number, hardMode: boolean }} options
 * @returns {object} Timer status
 */
export async function startFocus({ minutes, hardMode }) {
  // Reset strike count for new session
  strikeCount = 0;

  // Start session via AWS API — rank = hardMode, casual = normal
  const mode = hardMode ? 'rank' : 'casual';
  try {
    const sessionRes = await startSession(authToken, {
      mode,
      durationMinutes: minutes
    });
    currentSessionId = sessionRes.sessionId || `local_${Date.now()}`;
    console.log(`[AWS] Session started: ${currentSessionId}`);
  } catch (e) {
    console.error('[AWS] Failed to start session:', e.message);
    currentSessionId = `local_${Date.now()}`; // Fallback to local ID
  }

  timerState.active = true;
  timerState.hardMode = !!hardMode;
  timerState.totalMinutes = minutes;
  timerState.endTime = Date.now() + minutes * 60000;
  timerState.remaining = 0;
  timerState.paused = false;

  // Auto-enable focus mode
  focusMode = true;
  broadcastToClients(null);
  sendToRenderer('focus-mode-changed', focusMode);
  startTimerTick();
  console.log(`[Timer] Started ${minutes}min, hardMode=${hardMode}`);
  return getTimerStatus();
}

/**
 * Stop the focus session (only works in casual mode).
 * @returns {object} Timer status
 */
export async function stopFocus() {
  if (!timerState.active) return getTimerStatus();
  if (timerState.hardMode) return getTimerStatus(); // Can't stop in hard mode
  await stopTimerForcefully();
  return getTimerStatus();
}

/**
 * Get current session/timer status.
 * @returns {object} Timer status
 */
export function getSessionStatus() {
  return getTimerStatus();
}
