/**
 * Gacha Services — Gọi AWS Lambda cho Gacha Station
 * React <-> AWS (Gọi Mây) qua HTTP
 */

import { getValidAccessToken } from './tokenService';

const API_URL = import.meta.env.VITE_API_URL;

export const handleRollGachaApi = async () => {
  try {
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/gacha/roll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.log('Error rolling gacha:', e);
    return { errCode: -1, errMessage: e.message };
  }
};
