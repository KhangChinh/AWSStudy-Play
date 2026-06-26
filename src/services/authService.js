/**
 * authService.js - Quản lý phiên đăng nhập và Token
 */
import { fetchAuthSession } from 'aws-amplify/auth';

// Biến RAM cục bộ lưu trữ token để truy xuất nhanh, tránh gọi IPC Electron nhiều lần
let currentAccessToken = null;

/**
 * Hàm khởi tạo: Lấy token từ Electron hoặc Amplify và lưu vào RAM
 * Nên gọi hàm này 1 lần lúc App vừa load xong.
 */
export const initializeAuth = async () => {
  try {
    let oldToken = null;

    // 1. Thử lấy token cũ từ Electron (nếu có)
    if (window.api) {
      const response = await window.api.invoke('auth:loadToken');
      if (response && response.success && response.token) {
        oldToken = response.token;
        currentAccessToken = oldToken; // Tạm dùng token cũ để Amplify có context
      }
    }

    // 2. Gọi fetchAuthSession: Amplify sẽ tự động refresh token nếu cần
    const session = await fetchAuthSession();
    const newToken = 
      session.tokens?.idToken?.toString() || 
      session.tokens?.accessToken?.toString();

    if (newToken) {
      currentAccessToken = newToken;
      
      // 3. Lưu token mới đè lên token cũ (Token Rotation / Refresh)
      if (window.api) {
        await window.api.invoke('auth:saveToken', newToken);
        console.log('Auth initialized: Token has been refreshed and rotated.');
      } else {
        console.log('Auth initialized from Amplify (Web)');
      }
      return true;
    }

    // Nếu không lấy được token mới nhưng vẫn còn token cũ (trường hợp offline)
    return !!currentAccessToken;
  } catch (error) {
    console.warn('Không tìm thấy phiên đăng nhập hợp lệ hoặc lỗi refresh:', error);
    currentAccessToken = null;
    return false;
  }
};

/**
 * Lấy token hiện tại để gắn vào Header
 */
export const getValidToken = () => {
  return currentAccessToken;
};

/**
 * Kiểm tra trạng thái login của User để hiển thị UI
 */
export const checkLoginStatus = async () => {
  try {
    // Nếu app chưa kịp lấy token vào RAM, tiến hành lấy lại
    if (!currentAccessToken) {
      await initializeAuth();
    }

    if (currentAccessToken) {
      return {
        status: true,
        userInfo: {
          UserId: 'usr_local', 
          Username: 'Player',
          token: currentAccessToken,
        },
      };
    }

    return { status: false, userInfo: null };
  } catch (e) {
    console.error('Lỗi khi kiểm tra đăng nhập:', e);
    return { status: false, userInfo: null };
  }
};

/**
 * --- Các hàm tương tác với Electron IPC (Chuyển từ authServices.js cũ) ---
 */

export const handleSaveTokenApi = async (token) => {
  try {
    if (window.api) {
      const response = await window.api.invoke('auth:saveToken', token);
      return response;
    }
  } catch (e) {
    console.log('Error saving token:', e);
    return { success: false, error: e.message };
  }
};

export const handleLoadTokenApi = async () => {
  try {
    if (window.api) {
      const response = await window.api.invoke('auth:loadToken');
      return response;
    }
  } catch (e) {
    console.log('Error loading token:', e);
    return { success: false, error: e.message };
  }
};

export const handleClearTokenApi = async () => {
  try {
    currentAccessToken = null; // Clear RAM variable
    if (window.api) {
      const response = await window.api.invoke('auth:clearToken');
      return response;
    }
  } catch (e) {
    console.log('Error clearing token:', e);
    return { success: false, error: e.message };
  }
};

export const handleLoginApi = () => {
  if (window.api) {
    window.api.send('login');
  }
};

export const handleLoginSuccessApi = () => {
  if (window.api) {
    window.api.send('login-success');
  }
};

export const handleLogoutApi = () => {
  currentAccessToken = null; // Clear RAM variable
  if (window.api) {
    window.api.send('logout');
  }
};

