export const SET_SOCIAL = 'SET_SOCIAL';
export const APPEND_SOCIAL = 'APPEND_SOCIAL';
export const MERGE_SOCIAL_FRIENDS = 'MERGE_SOCIAL_FRIENDS';
export const CLEAR_SOCIAL = 'CLEAR_SOCIAL';

export const setSocial = (payload) => ({
  type: SET_SOCIAL,
  payload, // payload = { items: [], lastKey: ... }
});

export const appendSocial = (payload) => ({
  type: APPEND_SOCIAL,
  payload,
});

export const mergeSocialFriends = (payload) => ({
  type: MERGE_SOCIAL_FRIENDS,
  payload,
});

export const clearSocial = () => ({
  type: CLEAR_SOCIAL,
});