import { SET_AI_SETTINGS } from '../actions/settingsActions';

const initialState = {
  aiSettings: {
    faceTracking: { provider: 'bedrock', selectedModel: '', apiKey: '' },
    blocker: { provider: 'bedrock', selectedModel: '', apiKey: '' },
    studyPlanner: { provider: 'bedrock', selectedModel: '', apiKey: '' },
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
