/* ===== Session API — AWS API Gateway Client =====
   ESM module. Handles: startSession, recordStrike, endSession.
   Uses native fetch (Node 24.x).
   API_BASE is set dynamically from React via setApiUrl().
*/

let API_BASE = '';

export function setApiUrl(url) {
  API_BASE = url;
  console.log('[SessionAPI] API URL set:', url);
}

export async function startSession(token, { mode, durationMinutes }) {
  if (!API_BASE) { console.error('[SessionAPI] API_BASE not set'); return { success: false }; }
  
  const cleanBase = API_BASE.replace(/\/$/, ''); // Xóa dấu / ở cuối nếu có
  const url = `${cleanBase}/start-study-session`;
  console.log(`\n[SessionAPI] 🟢 Đang gọi API Bắt đầu Session:`, url);
  console.log(`[SessionAPI] Token có tồn tại không?:`, !!token);
  console.log(`[SessionAPI] Payload gửi đi:`, { mode, durationMinutes });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mode, durationMinutes })
    });
    
    const data = await res.json();
    console.log(`[SessionAPI] 🔴 Kết quả từ Server trả về (start-session):`, res.status, data);
    return data;
  } catch (error) {
    console.error(`[SessionAPI] ❌ Lỗi mạng khi gọi start-session:`, error);
    return { success: false, error: error.message };
  }
}

export async function recordStrike(token, { sessionId }) {
  if (!API_BASE) { console.error('[SessionAPI] API_BASE not set'); return { success: false }; }
  
  const cleanBase = API_BASE.replace(/\/$/, '');
  const url = `${cleanBase}/strike`;
  console.log(`\n[SessionAPI] 🟢 Đang gọi API Đánh dấu Strike:`, url, { sessionId });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });
    
    const data = await res.json();
    console.log(`[SessionAPI] 🔴 Kết quả từ Server trả về (strike):`, res.status, data);
    return data;
  } catch (error) {
    console.error(`[SessionAPI] ❌ Lỗi mạng khi gọi strike:`, error);
    return { success: false, error: error.message };
  }
}

export async function endSession(token, { sessionId }) {
  if (!API_BASE) { console.error('[SessionAPI] API_BASE not set'); return { success: false }; }
  
  const cleanBase = API_BASE.replace(/\/$/, '');
  const url = `${cleanBase}/end-study-session`;
  console.log(`\n[SessionAPI] 🟢 Đang gọi API Kết thúc Session:`, url, { sessionId });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });
    
    const data = await res.json();
    console.log(`[SessionAPI] 🔴 Kết quả từ Server trả về (end-session):`, res.status, data);
    return data;
  } catch (error) {
    console.error(`[SessionAPI] ❌ Lỗi mạng khi gọi end-session:`, error);
    return { success: false, error: error.message };
  }
}
