export const SET_PROFILE = 'SET_PROFILE';
export const CLEAR_PROFILE = 'CLEAR_PROFILE';
export const UPDATE_BUDGET = 'UPDATE_BUDGET';

export const setProfile = (payload) => ({
  type: SET_PROFILE,
  payload,
});

export const clearProfile = () => ({
  type: CLEAR_PROFILE,
});

export const userLogin = setProfile;
export const userLogout = clearProfile;

export const updateBudget = (payload) => ({
  type: UPDATE_BUDGET,
  payload,
});