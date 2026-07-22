export const SET_GACHA_HISTORY = 'SET_GACHA_HISTORY';
export const APPEND_GACHA_HISTORY = 'APPEND_GACHA_HISTORY';
export const CLEAR_GACHA_HISTORY = 'CLEAR_GACHA_HISTORY';
export const SET_GACHA_BANNERS = 'SET_GACHA_BANNERS';

export const setGachaHistory = (payload) => ({
  type: SET_GACHA_HISTORY,
  payload, // payload = { gachaHistory: [], lastEvaluatedKey: ... }
});

export const appendGachaHistory = (payload) => ({
  type: APPEND_GACHA_HISTORY,
  payload,
});

export const clearGachaHistory = () => ({
  type: CLEAR_GACHA_HISTORY,
});

export const setGachaBanners = (payload) => ({
  type: SET_GACHA_BANNERS,
  payload,
});
