import { SET_DAILY_QUESTS, CLEAR_DAILY_QUESTS } from '../actions/questActions';

const initialState = {
  daily: null,
};

const questReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_DAILY_QUESTS:
      return {
        ...state,
        daily: action.payload,
      };
    case CLEAR_DAILY_QUESTS:
      return initialState;

    default:
      return state;
  }
};

export default questReducer;