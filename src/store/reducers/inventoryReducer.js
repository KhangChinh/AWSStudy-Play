import { SET_INVENTORY, APPEND_INVENTORY, CLEAR_INVENTORY } from '../actions/inventoryActions';

const initialState = {
  items: [],
  lastKey: null,
  hasMore: true,
  isLoading: false,
};

const inventoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_INVENTORY:
      return {
        ...state,
        items: action.payload.items || [],
        lastKey: action.payload.lastKey || null,
        hasMore: action.payload.lastKey !== null,
        isLoading: false,
      };
    case APPEND_INVENTORY:
      return {
        ...state,
        items: [...state.items, ...(action.payload.items || [])],
        lastKey: action.payload.lastKey || null,
        hasMore: action.payload.lastKey !== null,
        isLoading: false,
      };
    case CLEAR_INVENTORY:
      return initialState;

    default:
      return state;
  }
};

export default inventoryReducer;