import { SET_HIGHSCORES } from '../actions/minigameActions';

const initialState = {
  minigameHighscores: {},
};

const minigameReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_HIGHSCORES:
      return {
        ...state,
        minigameHighscores: {
          ...state.minigameHighscores,
          ...action.payload,
        },
      };

    default:
      return state;
  }
};

export default minigameReducer;
