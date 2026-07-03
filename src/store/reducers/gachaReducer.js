import { SET_GACHA_HISTORY, APPEND_GACHA_HISTORY, CLEAR_GACHA_HISTORY } from '../actions/gachaActions';

const initialState = {
  gachaHistory: [],
  gachaHistoryLastEvaluatedKey: null,
  hasMore: true,
  isLoading: false,
};

const gachaReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_GACHA_HISTORY:
      return {
        ...state,
        gachaHistory: action.payload.gachaHistory || [],
        gachaHistoryLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
        hasMore: action.payload.lastEvaluatedKey !== null,
        isLoading: false,
      };
    case APPEND_GACHA_HISTORY:
      return {
        ...state,
        gachaHistory: [...state.gachaHistory, ...(action.payload.gachaHistory || [])],
        gachaHistoryLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
        hasMore: action.payload.lastEvaluatedKey !== null,
        isLoading: false,
      };
    case CLEAR_GACHA_HISTORY:
      return initialState;

    default:
      return state;
  }
};

export default gachaReducer;