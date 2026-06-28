import { combineReducers } from 'redux';

import profileReducer from './profileReducer';
import inventoryReducer from './inventoryReducer';
import socialReducer from './socialReducer';
import questReducer from './questReducer';

const rootReducer = combineReducers({
    profile: profileReducer,
    inventory: inventoryReducer,
    social: socialReducer,
    quest: questReducer,
});

export default rootReducer;