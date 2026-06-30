import {
  SET_CHAT_SESSIONS,
  SET_STUDY_PLANS,
  SET_QUIZ_HISTORY,
  SET_STUDY_SETTINGS,
  CLEAR_STUDY_PLANNER,
} from '../actions/studyPlannerActions';

const initialState = {
  chatSessions: null,
  studyPlans: null,
  quizHistory: null,
  studySettings: null,
};

const studyPlannerReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CHAT_SESSIONS:
      return {
        ...state,
        chatSessions: action.payload,
      };
    case SET_STUDY_PLANS:
      return {
        ...state,
        studyPlans: action.payload,
      };
    case SET_QUIZ_HISTORY:
      return {
        ...state,
        quizHistory: action.payload,
      };
    case SET_STUDY_SETTINGS:
      return {
        ...state,
        studySettings: action.payload,
      };
    case CLEAR_STUDY_PLANNER:
      return initialState;
    default:
      return state;
  }
};

export default studyPlannerReducer;
