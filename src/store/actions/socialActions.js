export const SET_SOCIAL = 'SET_SOCIAL';
export const APPEND_SOCIAL = 'APPEND_SOCIAL';
export const CLEAR_SOCIAL = 'CLEAR_SOCIAL';

export const setSocial = (payload) => ({
  type: SET_SOCIAL,
  payload, // payload = { items: [], lastKey: ... }
});

export const appendSocial = (payload) => ({
  type: APPEND_SOCIAL,
  payload,
});

export const clearSocial = () => ({
  type: CLEAR_SOCIAL,
});

export const setFriends = (payload) => ({
  type: SET_SOCIAL,
  payload: {
    items: payload.friends || [],
    lastKey: payload.lastEvaluatedKey || null,
  },
});

export const appendFriends = (payload) => ({
  type: APPEND_SOCIAL,
  payload: {
    items: payload.friends || [],
    lastKey: payload.lastEvaluatedKey || null,
  },
});

export const setFriendSyncTime = (payload) => ({
  type: 'SET_FRIEND_SYNC_TIME',
  payload,
});