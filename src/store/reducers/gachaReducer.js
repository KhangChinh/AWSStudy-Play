import { SET_GACHA_HISTORY, APPEND_GACHA_HISTORY, CLEAR_GACHA_HISTORY } from '../actions/gachaActions';

const initialState = {
  gachaHistory: [],
  gachaHistoryLastEvaluatedKey: null,
  hasMore: true,
  isLoading: false,
};

const historyKey = (item) => `${item?.PK || ''}:${item?.SK || item?.timestamp || item?.acquiredAt || item?.name || ''}`;

const normalizeHistory = (items = []) => {
  const unique = new Map();
  items.forEach(item => unique.set(historyKey(item), item));

  return Array.from(unique.values()).sort((a, b) => {
    const aTime = Number(a?.SK || a?.timestamp || Date.parse(a?.acquiredAt) || 0);
    const bTime = Number(b?.SK || b?.timestamp || Date.parse(b?.acquiredAt) || 0);
    return bTime - aTime;
  });
};

const gachaReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_GACHA_HISTORY:
      return {
        ...state,
        gachaHistory: normalizeHistory(action.payload.gachaHistory),
        gachaHistoryLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
        hasMore: action.payload.lastEvaluatedKey !== null,
        isLoading: false,
      };
    case APPEND_GACHA_HISTORY:
      return {
        ...state,
        gachaHistory: normalizeHistory([...state.gachaHistory, ...(action.payload.gachaHistory || [])]),
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
