import { SET_AI_SETTINGS } from '../actions/settingsActions';

const initialState = {
  aiSettings: {
    faceTracking: { provider: 'ollama', selectedModel: '', apiKey: '' },
    blocker: { provider: 'ollama', selectedModel: '', apiKey: '' },
    studyPlanner: { provider: 'ollama', selectedModel: '', apiKey: '' },
  }
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_AI_SETTINGS:
      return {
        ...state,
        aiSettings: {
          ...state.aiSettings,
          ...action.payload
        }
      };
    default:
      return state;
  }
};

export default settingsReducer;
