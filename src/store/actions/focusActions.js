/**
 * focusActions.js - Action creators cho Focus Session va AI Guard
 */

const setFocusSettings = (data) => ({
  type: 'SET_FOCUS_SETTINGS',
  payload: data,
});

const setActiveSession = (data) => ({
  type: 'SET_ACTIVE_SESSION',
  payload: data,
});

export {
  setFocusSettings,
  setActiveSession,
};
