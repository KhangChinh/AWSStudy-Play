/**
 * Cognito Secure Storage — Custom KeyValueStorage cho Amplify v6
 *
 * Override localStorage mặc định của Cognito:
 *   - Tất cả tokens (Refresh, Access, ID) được lưu qua IPC → secureStore
 *   - secureStore mã hóa bằng safeStorage (OS-level encryption)
 *
 * Interface: { setItem, getItem, removeItem } — tất cả trả về Promise
 */

export const cognitoSecureStorage = {
  /**
   * Lưu token vào secure store qua IPC
   * @param {string} key - Cognito key (e.g. CognitoIdentityServiceProvider.xxx.refreshToken)
   * @param {string} value - Token value
   */
  async setItem(key, value) {
    if (!window.api) {
      // Fallback cho môi trường browser (không có Electron)
      localStorage.setItem(key, value);
      return;
    }
    await window.api.invoke('secureStore:setItem', { key, value: String(value) });
  },

  /**
   * Đọc token từ secure store qua IPC
   * @param {string} key
   * @returns {string|null}
   */
  async getItem(key) {
    if (!window.api) {
      return localStorage.getItem(key);
    }
    const result = await window.api.invoke('secureStore:getItem', key);
    return result.success ? result.value : null;
  },

  /**
   * Xóa token khỏi secure store qua IPC
   * @param {string} key
   */
  async removeItem(key) {
    if (!window.api) {
      localStorage.removeItem(key);
      return;
    }
    await window.api.invoke('secureStore:removeItem', key);
  },
};
