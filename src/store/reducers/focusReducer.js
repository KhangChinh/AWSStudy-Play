/**
 * focusReducer.js - Reducer quản lý phiên Focus và AI Guard
 */

const initialState = {
  focusSettings: { blacklist: [] },
  activeSession: null,
};

const focusReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_FOCUS_SETTINGS':
      return {
        ...state,
        focusSettings: { ...state.focusSettings, ...action.payload },
      };
    case 'SET_ACTIVE_SESSION':
      return {
        ...state,
        activeSession: action.payload,
      };
    default:
      return state;
  }
};

export default focusReducer;
