/**
 * gachaReducer.js - Reducer quản lý lịch sử gacha
 */

const initialState = {
  gachaHistory: [],
  gachaHistoryLastEvaluatedKey: null,
};

const gachaReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_GACHA_HISTORY':
      return {
        ...state,
        gachaHistory: action.payload.gachaHistory || [],
        gachaHistoryLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
      };
    default:
      return state;
  }
};

export default gachaReducer;
