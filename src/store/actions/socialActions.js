export const SET_FRIENDS = 'SET_FRIENDS';
export const SET_GACHA_HISTORY = 'SET_GACHA_HISTORY';

export const setFriends = (payload) => ({
  type: SET_FRIENDS,
  payload, // payload = { items: [], lastKey: ... }
});

export const setGachaHistory = (payload) => ({
  type: SET_GACHA_HISTORY,
  payload, // payload = { items: [], lastKey: ... }
});