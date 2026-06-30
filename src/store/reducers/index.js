import { combineReducers } from 'redux';

import profileReducer from './profileReducer';
import inventoryReducer from './inventoryReducer';
import socialReducer from './socialReducer';
import gachaReducer from './gachaReducer';
import questReducer from './questReducer';
import syncReducer from './syncReducer';
<<<<<<< HEAD
import minigameReducer from './minigameReducer';
=======
import studyPlannerReducer from './studyPlannerReducer';
>>>>>>> 72ebd4bc293783fe4dbdfab2f8dd412fb7556921

const rootReducer = combineReducers({
  profile: profileReducer,
  inventory: inventoryReducer,
  social: socialReducer,
  gacha: gachaReducer,
  quest: questReducer,
  sync: syncReducer,
<<<<<<< HEAD
  minigame: minigameReducer,
=======
  studyPlanner: studyPlannerReducer,
>>>>>>> 72ebd4bc293783fe4dbdfab2f8dd412fb7556921
});

export default rootReducer;