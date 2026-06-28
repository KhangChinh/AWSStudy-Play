export const SET_PROFILE = 'SET_PROFILE';
export const CLEAR_PROFILE = 'CLEAR_PROFILE';

export const setProfile = (payload) => ({
  type: SET_PROFILE,
  payload,
});

export const clearProfile = () => ({
  type: CLEAR_PROFILE,
});