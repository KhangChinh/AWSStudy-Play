/**
 * gachaActions.js - Action creators cho lich su Gacha
 */

const setGachaHistory = (data) => ({
  type: 'SET_GACHA_HISTORY',
  payload: data,
});

export {
  setGachaHistory,
};
