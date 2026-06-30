import { SET_PROFILE, CLEAR_PROFILE, UPDATE_BUDGET } from '../actions/profileActions';

const initialState = {
  userProfile: null,
};

const profileReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_PROFILE:
      return {
        ...state,
        userProfile: action.payload,
      };

    case CLEAR_PROFILE:
      return {
        ...state,
        userProfile: null,
      };

    case UPDATE_BUDGET:
      if (!state.userProfile) return state;
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          budget: {
            ...(state.userProfile.budget || {}),
            ...action.payload,
          },
        },
      };

    default:
      return state;
  }
};

export default profileReducer;