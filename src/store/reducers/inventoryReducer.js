import { SET_INVENTORY, CLEAR_INVENTORY } from '../actions/inventoryActions';

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
        // Tự động tính toán hasMore dựa trên lastKey
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