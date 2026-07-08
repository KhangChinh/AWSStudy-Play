import { SET_INVENTORY, APPEND_INVENTORY, CLEAR_INVENTORY } from '../actions/inventoryActions';

const types = (import.meta.env.VITE_INVENTORY_TYPES).split(',');

const initialState = types.reduce((acc, type) => {
  acc[type] = { items: [], lastKey: null, hasMore: true, isLoading: false };
  return acc;
}, {});

const inventoryReducer = (state = initialState, action) => {
  const { itemType, items, lastKey } = action.payload || {};
  switch (action.type) {
    case SET_INVENTORY:
      if (!itemType || !state[itemType]) return state;
      return {
        ...state,
        [itemType]: {
          items: items || [],
          lastKey: lastKey || null,
          hasMore: lastKey !== null,
          isLoading: false,
        }
      };

    case APPEND_INVENTORY:
      if (!itemType || !state[itemType]) return state;
      return {
        ...state,
        [itemType]: {
          items: [...state[itemType].items, ...(items || [])],
          lastKey: lastKey || null,
          hasMore: lastKey !== null,
          isLoading: false,
        }
      };

    case CLEAR_INVENTORY:
      return initialState;

    default:
      return state;
  }
};

export default inventoryReducer;