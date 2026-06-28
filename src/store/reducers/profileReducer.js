import { SET_PROFILE, CLEAR_PROFILE, } from '../actions/profileActions';

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

    default:
      return state;
  }
};

export default profileReducer;