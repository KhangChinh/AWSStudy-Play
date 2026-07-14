import { combineReducers } from 'redux';
import { LOGOUT_CLEAR_DATA } from '../actions/authActions';

import profileReducer from './profileReducer';
import inventoryReducer from './inventoryReducer';
import socialReducer from './socialReducer';
import gachaReducer from './gachaReducer';
import questReducer from './questReducer';
import syncReducer from './syncReducer';
import studyPlannerReducer from './studyPlannerReducer';
import minigameReducer from './minigameReducer';
import minigameLogsReducer from './minigameLogReducer';
import settingsReducer from './settingsReducer';
import shopReducer from './shopReducer';

const appReducer = combineReducers({
  profile: profileReducer,
  inventory: inventoryReducer,
  social: socialReducer,
  gacha: gachaReducer,
  quest: questReducer,
  sync: syncReducer,
  studyPlanner: studyPlannerReducer,
  minigame: minigameReducer,
  minigameLogs: minigameLogsReducer,
  settings: settingsReducer,
  shop: shopReducer,
});

const rootReducer = (state, action) => {
  if (action.type === LOGOUT_CLEAR_DATA) {
    // When logout, reset AI settings to initial values but keep the slice
    const { settings } = state || {};
    state = { settings };
  }
  return appReducer(state, action);
};

export default rootReducer;
