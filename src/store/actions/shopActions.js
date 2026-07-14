export const SET_SHOP = 'SET_SHOP';
export const CLEAR_SHOP = 'CLEAR_SHOP';

export const setShop = (payload) => ({ type: SET_SHOP, payload });
export const clearShop = () => ({ type: CLEAR_SHOP });
