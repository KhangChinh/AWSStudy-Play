/**
 * Study Planner Store — electron-store (base64)
 * Lưu: chat history (max 5), study plans (max 5), quiz history (max 10)
 */

import Store from 'electron-store';

const store = new Store({ name: 'study-planner-store' });

const MAX_CHATS = 5;
const MAX_PLANS = 5;
const MAX_QUIZZES = 10;

// ===== Helpers =====
function encode(data) {
  return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64');
}

function decode(base64) {
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

function loadKey(key) {
  try {
    const raw = store.get(key);
    if (!raw) return [];
    return decode(raw);
  } catch {
    return [];
  }
}

function saveKey(key, data) {
  store.set(key, encode(data));
}

// ═══════════════════════════════════════════
//  CHAT HISTORY
// ═══════════════════════════════════════════

export function loadChatHistory() {
  try {
    return { success: true, data: loadKey('chat_history') };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function saveChatSession(session) {
  try {
    let history = loadKey('chat_history');
    const idx = history.findIndex(c => c.id === session.id);
    if (idx >= 0) {
      history[idx] = session;
    } else {
      history.unshift(session);
      if (history.length > MAX_CHATS) history = history.slice(0, MAX_CHATS);
    }
    saveKey('chat_history', history);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function deleteChatSession(chatId) {
  try {
    let history = loadKey('chat_history');
    history = history.filter(c => c.id !== chatId);
    saveKey('chat_history', history);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════
//  STUDY PLANS
// ═══════════════════════════════════════════

export function loadStudyPlans() {
  try {
    return { success: true, data: loadKey('study_plans') };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function saveStudyPlan(plan) {
  try {
    let plans = loadKey('study_plans');
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = plan;
    } else {
      plans.unshift(plan);
      if (plans.length > MAX_PLANS) plans = plans.slice(0, MAX_PLANS);
    }
    saveKey('study_plans', plans);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function deleteStudyPlan(planId) {
  try {
    let plans = loadKey('study_plans');
    plans = plans.filter(p => p.id !== planId);
    saveKey('study_plans', plans);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════
//  QUIZ HISTORY
// ═══════════════════════════════════════════

export function loadQuizHistory() {
  try {
    return { success: true, data: loadKey('quiz_history') };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function saveQuizResult(quiz) {
  try {
    let history = loadKey('quiz_history');
    const idx = history.findIndex(q => q.id === quiz.id);
    if (idx >= 0) {
      history[idx] = quiz;
    } else {
      history.unshift(quiz);
      if (history.length > MAX_QUIZZES) history = history.slice(0, MAX_QUIZZES);
    }
    saveKey('quiz_history', history);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function deleteQuizResult(quizId) {
  try {
    let history = loadKey('quiz_history');
    history = history.filter(q => q.id !== quizId);
    saveKey('quiz_history', history);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════
//  SETTINGS (AI Provider)
// ═══════════════════════════════════════════

export function loadStudySettings() {
  try {
    const defaultSettings = { aiProvider: 'ollama', geminiKey: '' };
    const raw = store.get('study_settings');
    if (!raw) return { success: true, data: defaultSettings };
    return { success: true, data: { ...defaultSettings, ...decode(raw) } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function saveStudySettings(settings) {
  try {
    console.log('[StudyPlannerStore] Lưu cấu hình AI:', { 
      provider: settings?.aiProvider,
      hasGeminiKey: !!settings?.geminiKey
    });
    store.set('study_settings', encode(settings));
    return { success: true };
  } catch (err) {
    console.error('[StudyPlannerStore] Lỗi khi lưu cấu hình AI:', err);
    return { success: false, error: err.message };
  }
}
