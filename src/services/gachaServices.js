/**
 * Gacha Services — Gọi AWS Lambda cho Gacha Station
 * React <-> AWS (Gọi Mây) qua HTTP
 */

import { apiCall } from '../utils/package';

export const handleRollGachaApi = async () => {
  try {
    const response = await apiCall('/gacha/roll', { method: 'POST' });
    return response;
  } catch (e) {
    console.log('Error rolling gacha:', e);
    return { errCode: -1, errMessage: e.message };
  }
};
