/**
 * Package Utilities — Các hàm tiện ích dùng chung
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

//api caller
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  const response = await fetch(url, config);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

//check login
//placeholder
export const checkLoginStatus = async () => {
  try {
    if (!window.api) {
      return { status: false, userInfo: null };
    }
    const tokenResult = await window.api.invoke('auth:loadToken');
    if (tokenResult && tokenResult.success && tokenResult.token) {
      // TODO: Gửi token lên Cognito để xin AccessToken mới
      return {
        status: true,
        userInfo: {
          UserId: 'usr_local',
          Username: 'Player',
          token: tokenResult.token,
        },
      };
    }
    return { status: false, userInfo: null };
  } catch (e) {
    console.log('Error checking login:', e);
    return { status: false, userInfo: null };
  }
};
