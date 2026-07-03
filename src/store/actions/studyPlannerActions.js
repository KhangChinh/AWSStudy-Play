export const SET_CHAT_SESSIONS = 'SET_CHAT_SESSIONS';
export const SET_STUDY_PLANS = 'SET_STUDY_PLANS';
export const SET_QUIZ_HISTORY = 'SET_QUIZ_HISTORY';
export const SET_STUDY_SETTINGS = 'SET_STUDY_SETTINGS';
export const CLEAR_STUDY_PLANNER = 'CLEAR_STUDY_PLANNER';

export const setChatSessions = (payload) => ({
  type: SET_CHAT_SESSIONS,
  payload,
});

export const setStudyPlans = (payload) => ({
  type: SET_STUDY_PLANS,
  payload,
});

export const setQuizHistory = (payload) => ({
  type: SET_QUIZ_HISTORY,
  payload,
});

export const setStudySettings = (payload) => ({
  type: SET_STUDY_SETTINGS,
  payload,
});

export const clearStudyPlanner = () => ({
  type: CLEAR_STUDY_PLANNER,
});
