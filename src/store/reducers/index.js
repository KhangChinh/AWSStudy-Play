import { combineReducers } from 'redux';

import profileReducer from './profileReducer';
import inventoryReducer from './inventoryReducer';
import socialReducer from './socialReducer';
import gachaReducer from './gachaReducer';
import questReducer from './questReducer';
import syncReducer from './syncReducer';
import studyPlannerReducer from './studyPlannerReducer';
import minigameReducer from './minigameReducer';

const appReducer = combineReducers({
  profile: profileReducer,
  inventory: inventoryReducer,
  social: socialReducer,
  gacha: gachaReducer,
  quest: questReducer,
  sync: syncReducer,
  studyPlanner: studyPlannerReducer,
  minigame: minigameReducer,
});

import { LOGOUT_CLEAR_DATA } from '../actions/authActions';

const rootReducer = (state, action) => {
  if (action.type === LOGOUT_CLEAR_DATA) {
    // Reset Redux state to undefined, causing all child reducers to return their initial states
    state = undefined;
  }
  return appReducer(state, action);
};

export default rootReducer;