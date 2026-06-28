/**
 * minigameReducer.js - Reducer quản lý highscore của minigames
 */

const initialState = {
  minigameHighscores: {},
};

const minigameReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_HIGHSCORES':
      return {
        ...state,
        minigameHighscores: { ...state.minigameHighscores, ...action.payload },
      };
    default:
      return state;
  }
};

export default minigameReducer;
