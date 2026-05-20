/**
 * Auth Services — Gọi Electron IPC cho xác thực & token
 * React <-> Local Node.js (Gọi Máy tính) qua window.api
 */

export const handleSaveTokenApi = async (token) => {
  try {
    const response = await window.api.invoke('auth:saveToken', token);
    return response;
  } catch (e) {
    console.log('Error saving token:', e);
    return { success: false, error: e.message };
  }
};

export const handleLoadTokenApi = async () => {
  try {
    const response = await window.api.invoke('auth:loadToken');
    return response;
  } catch (e) {
    console.log('Error loading token:', e);
    return { success: false, error: e.message };
  }
};

export const handleClearTokenApi = async () => {
  try {
    const response = await window.api.invoke('auth:clearToken');
    return response;
  } catch (e) {
    console.log('Error clearing token:', e);
    return { success: false, error: e.message };
  }
};

export const handleLoginSuccessApi = () => {
  if (window.api) {
    window.api.send('login-success');
  }
};

export const handleLogoutApi = () => {
  if (window.api) {
    window.api.send('logout');
  }
};
