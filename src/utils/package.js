/**
 * Package Utilities — Các hàm tiện ích dùng chung
 */

export { apiCall, API_BASE_URL } from './api';

//check login
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
