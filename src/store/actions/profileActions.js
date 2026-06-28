export const SET_PROFILE = 'SET_PROFILE';
export const CLEAR_PROFILE = 'CLEAR_PROFILE';

export const setProfile = (profileData) => {
  return {
    type: SET_PROFILE,
    payload: profileData,
  };
};

export const clearProfile = () => {
  return {
    type: CLEAR_PROFILE,
  };
};