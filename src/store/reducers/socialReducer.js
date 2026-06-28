import { SET_FRIENDS, SET_GACHA_HISTORY } from '../actions/socialActions';

const initialState = {
  friends: {
    items: [],
    lastKey: null,
    hasMore: true,
    isLoading: false,
  },
  gachaHistory: {
    items: [],
    lastKey: null,
    hasMore: true,
    isLoading: false,
  },
};

const socialReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_FRIENDS:
      return {
        ...state,
        friends: {
          ...state.friends,
          items: action.payload.items || [],
          lastKey: action.payload.lastKey || null,
          hasMore: action.payload.lastKey !== null,
          isLoading: false,
        },
      };

    case SET_GACHA_HISTORY:
      return {
        ...state,
        gachaHistory: {
          ...state.gachaHistory,
          items: action.payload.items || [],
          lastKey: action.payload.lastKey || null,
          hasMore: action.payload.lastKey !== null,
          isLoading: false,
        },
      };

    default:
      return state;
  }
};

export default socialReducer;