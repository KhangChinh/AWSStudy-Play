import { combineReducers } from 'redux';

import profileReducer from './profileReducer';
import inventoryReducer from './inventoryReducer';
import socialReducer from './socialReducer';
import gachaReducer from './gachaReducer';
import questReducer from './questReducer';
import syncReducer from './syncReducer';
import minigameReducer from './minigameReducer';

const rootReducer = combineReducers({
  profile: profileReducer,
  inventory: inventoryReducer,
  social: socialReducer,
  gacha: gachaReducer,
  quest: questReducer,
  sync: syncReducer,
  minigame: minigameReducer,
});

export default rootReducer;