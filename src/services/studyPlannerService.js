import { store } from '../store';
import {
  setChatSessions,
  setStudyPlans,
  setQuizHistory,
  setStudySettings,
} from '../store/actions';

// ==========================================
// CHAT SESSIONS
// ==========================================
export const loadChatSessions = async () => {
  const reduxData = store.getState().studyPlanner.chatSessions;
  if (reduxData !== null) return reduxData;

  try {
    const diskData = await window.api?.invoke('study:loadChats');
    const chats = diskData?.success ? diskData.data : [];
    store.dispatch(setChatSessions(chats));
    return chats;
  } catch (err) {
    console.error('Error loading chat sessions:', err);
    return [];
  }
};

export const saveChatSession = async (session) => {
  const current = store.getState().studyPlanner.chatSessions || [];
  let updated = [...current];
  const idx = updated.findIndex((c) => c.id === session.id);
  if (idx >= 0) {
    updated[idx] = session;
  } else {
    updated.unshift(session);
    if (updated.length > 5) updated = updated.slice(0, 5); // MAX_CHATS
  }
  store.dispatch(setChatSessions(updated));
  try {
    await window.api?.invoke('study:saveChat', session);
  } catch (err) {
    console.error('Error saving chat session:', err);
  }
};

export const deleteChatSession = async (chatId) => {
  const current = store.getState().studyPlanner.chatSessions || [];
  const updated = current.filter((c) => c.id !== chatId);
  store.dispatch(setChatSessions(updated));
  try {
    await window.api?.invoke('study:deleteChat', chatId);
  } catch (err) {
    console.error('Error deleting chat session:', err);
  }
};

// ==========================================
// STUDY PLANS
// ==========================================
export const loadStudyPlans = async () => {
  const reduxData = store.getState().studyPlanner.studyPlans;
  if (reduxData !== null) return reduxData;

  try {
    const diskData = await window.api?.invoke('study:loadPlans');
    const plans = diskData?.success ? diskData.data : [];
    store.dispatch(setStudyPlans(plans));
    return plans;
  } catch (err) {
    console.error('Error loading study plans:', err);
    return [];
  }
};

export const saveStudyPlan = async (plan) => {
  const current = store.getState().studyPlanner.studyPlans || [];
  let updated = [...current];
  const idx = updated.findIndex((p) => p.id === plan.id);
  if (idx >= 0) {
    updated[idx] = plan;
  } else {
    updated.unshift(plan);
    if (updated.length > 5) updated = updated.slice(0, 5); // MAX_PLANS
  }
  store.dispatch(setStudyPlans(updated));
  try {
    await window.api?.invoke('study:savePlan', plan);
  } catch (err) {
    console.error('Error saving study plan:', err);
  }
};

export const deleteStudyPlan = async (planId) => {
  const current = store.getState().studyPlanner.studyPlans || [];
  const updated = current.filter((p) => p.id !== planId);
  store.dispatch(setStudyPlans(updated));
  try {
    await window.api?.invoke('study:deletePlan', planId);
  } catch (err) {
    console.error('Error deleting study plan:', err);
  }
};

// ==========================================
// QUIZ HISTORY
// ==========================================
export const loadQuizHistory = async () => {
  const reduxData = store.getState().studyPlanner.quizHistory;
  if (reduxData !== null) return reduxData;

  try {
    const diskData = await window.api?.invoke('study:loadQuizzes');
    const quizzes = diskData?.success ? diskData.data : [];
    store.dispatch(setQuizHistory(quizzes));
    return quizzes;
  } catch (err) {
    console.error('Error loading quiz history:', err);
    return [];
  }
};

export const saveQuizResult = async (quiz) => {
  const current = store.getState().studyPlanner.quizHistory || [];
  let updated = [...current];
  const idx = updated.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) {
    updated[idx] = quiz;
  } else {
    updated.unshift(quiz);
    if (updated.length > 10) updated = updated.slice(0, 10); // MAX_QUIZZES
  }
  store.dispatch(setQuizHistory(updated));
  try {
    await window.api?.invoke('study:saveQuiz', quiz);
  } catch (err) {
    console.error('Error saving quiz:', err);
  }
};

export const deleteQuizResult = async (quizId) => {
  const current = store.getState().studyPlanner.quizHistory || [];
  const updated = current.filter((q) => q.id !== quizId);
  store.dispatch(setQuizHistory(updated));
  try {
    await window.api?.invoke('study:deleteQuiz', quizId);
  } catch (err) {
    console.error('Error deleting quiz:', err);
  }
};

// ==========================================
// STUDY SETTINGS
// ==========================================
export const loadStudySettings = async () => {
  const reduxData = store.getState().studyPlanner.studySettings;
  if (reduxData !== null) return reduxData;

  try {
    const diskData = await window.api?.invoke('study:loadSettings');
    const settings = diskData?.success ? diskData.data : { aiProvider: 'bedrock', geminiKey: '' };
    store.dispatch(setStudySettings(settings));
    return settings;
  } catch (err) {
    console.error('Error loading study settings:', err);
    return { aiProvider: 'bedrock', geminiKey: '' };
  }
};

export const saveStudySettings = async (settings) => {
  store.dispatch(setStudySettings(settings));
  try {
    const result = await window.api?.invoke('study:saveSettings', settings);
    return result;
  } catch (err) {
    console.error('Error saving study settings:', err);
    return { success: false, error: err.message };
  }
};
