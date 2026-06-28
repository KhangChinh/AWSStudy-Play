import { SET_LAST_SYNC_ALL } from '../actions/syncActions';

const initialState = {
  lastSyncAll: null,
};

const syncReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_LAST_SYNC_ALL:
      return {
        ...state,
        lastSyncAll: action.payload,
      };

    default:
      return state;
  }
};

export default syncReducer;
