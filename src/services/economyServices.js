//placeholder
/**
 * Economy Services — Gọi AWS cho Economy (P-Coin, Balance)
 * React <-> AWS (Gọi Mây) qua HTTP
 */

<<<<<<< HEAD
import { apiCall } from '../utils/api';
=======
import { getValidAccessToken } from './tokenService';

const API_URL = import.meta.env.VITE_API_URL;
>>>>>>> 72ebd4bc293783fe4dbdfab2f8dd412fb7556921

export const handleGetBalanceApi = async () => {
  try {
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/economy/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.log('Error getting balance:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

export const handleSyncGameResultApi = async (data) => {
  try {
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/economy/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.log('Error syncing game result:', e);
    return { errCode: -1, errMessage: e.message };
  }
};
