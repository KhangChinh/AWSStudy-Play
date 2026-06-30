import { SET_SOCIAL, APPEND_SOCIAL, CLEAR_SOCIAL } from '../actions/socialActions';

const initialState = {
  items: [],
  lastKey: null,
  hasMore: true,
  isLoading: false,
};

const socialReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SOCIAL: {
      const items = action.payload.items || [];
      const lastKey = action.payload.lastKey || null;
      return {
        ...state,
        items,
        lastKey,
        friends: items,
        friendLastEvaluatedKey: lastKey,
        hasMore: lastKey !== null,
        isLoading: false,
      };
    }
    case APPEND_SOCIAL: {
      const newItems = [...state.items, ...(action.payload.items || [])];
      const lastKey = action.payload.lastKey || null;
      return {
        ...state,
        items: newItems,
        lastKey,
        friends: newItems,
        friendLastEvaluatedKey: lastKey,
        hasMore: lastKey !== null,
        isLoading: false,
      };
    }
    case 'SET_FRIEND_SYNC_TIME':
      return {
        ...state,
        friendUpdatedAt: action.payload,
      };
    case CLEAR_SOCIAL:
      return initialState;

    default:
      return state;
  }
};

export default socialReducer;