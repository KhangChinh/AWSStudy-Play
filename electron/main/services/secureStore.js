/**
 * Secure Store — Lưu trữ Token và Timestamp bằng electron-store + safeStorage
 *
 * Zero-Trust: KHÔNG lưu userData, chỉ lưu:
 *   - Cognito tokens (CognitoIdentityServiceProvider.*)
 *   - lastActiveTimestamp (Sliding Expiration)
 *
 * Mã hóa:
 *   - Production: safeStorage (DPAPI trên Windows / Keychain trên macOS)
 *   - Dev: Bypass mã hóa khi VITE_DEV_SERVER_URL tồn tại hoặc safeStorage không khả dụng
 */

import Store from 'electron-store';
import { safeStorage } from 'electron';

const store = new Store({
  name: 'secure-store',
});

/**
 * Kiểm tra xem có nên mã hóa hay không
 * Bypass khi đang chạy Dev hoặc safeStorage không khả dụng
 */
function shouldEncrypt() {
  if (process.env.VITE_DEV_SERVER_URL) return false;
  return safeStorage.isEncryptionAvailable();
}

/**
 * Mã hóa chuỗi bằng safeStorage → trả về base64
 */
function encrypt(text) {
  if (!shouldEncrypt()) return text;
  const buffer = safeStorage.encryptString(text);
  return buffer.toString('base64');
}

/**
 * Giải mã base64 → chuỗi gốc bằng safeStorage
 */
function decrypt(base64String) {
  if (!shouldEncrypt()) return base64String;
  try {
    const buffer = Buffer.from(base64String, 'base64');
    return safeStorage.decryptString(buffer);
  } catch {
    // Nếu giải mã thất bại (dữ liệu cũ chưa mã hóa), trả về nguyên gốc
    return base64String;
  }
}

/**
 * Lưu một item vào secure store (mã hóa value)
 * @param {string} key
 * @param {string} value
 * @returns {{ success: boolean, error?: string }}
 */
export function secureSetItem(key, value) {
  try {
    const encrypted = encrypt(String(value));
    store.set(key, encrypted);
    return { success: true };
  } catch (err) {
    console.error('❌ [secureStore] Lỗi khi set:', key, err);
    return { success: false, error: err.message };
  }
}

/**
 * Đọc một item từ secure store (giải mã value)
 * @param {string} key
 * @returns {{ success: boolean, value?: string, error?: string }}
 */
export function secureGetItem(key) {
  try {
    const encrypted = store.get(key);
    if (encrypted === undefined || encrypted === null) {
      return { success: true, value: null };
    }
    const decrypted = decrypt(String(encrypted));
    return { success: true, value: decrypted };
  } catch (err) {
    console.error('❌ [secureStore] Lỗi khi get:', key, err);
    return { success: false, error: err.message };
  }
}

/**
 * Xóa một item khỏi secure store
 * @param {string} key
 * @returns {{ success: boolean, error?: string }}
 */
export function secureRemoveItem(key) {
  try {
    store.delete(key);
    return { success: true };
  } catch (err) {
    console.error('❌ [secureStore] Lỗi khi remove:', key, err);
    return { success: false, error: err.message };
  }
}

/**
 * Xóa toàn bộ secure store (logout / session expired)
 * @returns {{ success: boolean, error?: string }}
 */
export function secureClear() {
  try {
    store.clear();
    console.log('🗑️ [secureStore] Đã xóa toàn bộ secure store');
    return { success: true };
  } catch (err) {
    console.error('❌ [secureStore] Lỗi khi clear:', err);
    return { success: false, error: err.message };
  }
}
