import { CLEAR_SHOP, SET_SHOP } from '../actions/shopActions';

const initialState = { activeItems: [], expiresAt: null, updatedAt: null, hydrated: false };

const shopReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SHOP:
      return {
        ...initialState,
        ...(action.payload || {}),
        activeItems: Array.isArray(action.payload?.activeItems) ? action.payload.activeItems : [],
        hydrated: true,
      };
    case CLEAR_SHOP:
      return { ...initialState };
    default:
      return state;
  }
};

export default shopReducer;
