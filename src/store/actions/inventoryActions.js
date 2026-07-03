export const SET_INVENTORY = 'SET_INVENTORY';
export const APPEND_INVENTORY = 'APPEND_INVENTORY';
export const CLEAR_INVENTORY = 'CLEAR_INVENTORY';

export const setInventory = (payload) => ({
  type: SET_INVENTORY,
  payload, // payload = { items: [], lastKey: ... }
});

export const appendInventory = (payload) => ({
  type: APPEND_INVENTORY,
  payload,
});

export const clearInventory = () => ({
  type: CLEAR_INVENTORY,
});