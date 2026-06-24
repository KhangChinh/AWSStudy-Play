import { getValidIdToken } from './authHelper';

const API_URL = import.meta.env.VITE_USER_API_URL;

const getUserFromApi = async () => {
  try {
    const idToken = await getValidIdToken();
    if (!idToken) {
      return { success: false, error: 'Unauthorized: No token available' };
    }
    const cleanApiUrl = API_URL.replace(/\/$/, '');
    const response = await fetch(`${cleanApiUrl}/get-profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { success: false, error: `API Error: ${response.status}` };
    }
    const result = await response.json();
    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.message || 'Unknown error from server' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export {
  getUserFromApi
};