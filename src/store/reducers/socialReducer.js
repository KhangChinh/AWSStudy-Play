import { SET_SOCIAL, APPEND_SOCIAL, CLEAR_SOCIAL } from '../actions/socialActions';

const initialState = {
  items: [],
  lastKey: null,
  hasMore: true,
  isLoading: false,
};

const socialReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SOCIAL:
      return {
        ...state,
        items: action.payload.items || [],
        lastKey: action.payload.lastKey || null,
        hasMore: action.payload.lastKey !== null,
        isLoading: false,
      };
    case APPEND_SOCIAL:
      return {
        ...state,
        items: [...state.items, ...(action.payload.items || [])],
        lastKey: action.payload.lastKey || null,
        hasMore: action.payload.lastKey !== null,
        isLoading: false,
      };
    case CLEAR_SOCIAL:
      return initialState;

    default:
      return state;
  }
};

export default socialReducer;