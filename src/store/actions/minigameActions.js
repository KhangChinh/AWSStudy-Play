/**
 * minigameActions.js - Action creators cho diem so tro choi mini
 */

const setHighscores = (data) => ({
  type: 'SET_HIGHSCORES',
  payload: data,
});

export {
  setHighscores,
};
