/**
 * User Store — Lưu trữ thông tin User cục bộ bằng electron-store + safeStorage
 * 
 * Dùng để cache dữ liệu user sau khi đăng nhập (DynamoDB data)
 * → Giúp load nhanh hơn lần sau, không cần gọi API mỗi lần mở app
 * 
 * Mã hóa: safeStorage (DPAPI trên Windows / Keychain trên macOS)
 * → Không hardcode key, dùng mã hóa cấp hệ điều hành
 * → Hiện tại đang TẮT mã hóa để dễ debug khi dev
 */

import Store from 'electron-store';
// import { safeStorage } from 'electron';

const store = new Store({
  name: 'user-data',
});

// /**
//  * Mã hóa chuỗi bằng safeStorage → trả về base64
//  */
// function encrypt(text) {
//   if (!safeStorage.isEncryptionAvailable()) return text;
//   const buffer = safeStorage.encryptString(text);
//   return buffer.toString('base64');
// }

// /**
//  * Giải mã base64 → chuỗi gốc bằng safeStorage
//  */
// function decrypt(base64String) {
//   if (!safeStorage.isEncryptionAvailable()) return base64String;
//   const buffer = Buffer.from(base64String, 'base64');
//   return safeStorage.decryptString(buffer);
// }

/**
 * Lưu thông tin user vào electron-store
 * @param {Object} userData - { userId, email, name, createdAt, ... }
 * @returns {{ success: boolean, error?: string }}
 */
export function saveUserToStore(userData) {
  try {
    store.set('currentUser', userData);
    store.set('lastLoginAt', new Date().toISOString());
    console.log('💾 [electron-store] Đã lưu user data:', userData);
    console.log('📂 [electron-store] File lưu tại:', store.path);
    return { success: true };
  } catch (err) {
    console.error('❌ [electron-store] Lỗi khi lưu:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Đọc thông tin user từ electron-store
 * @returns {{ success: boolean, data?: Object, lastLoginAt?: string, error?: string }}
 */
export function getUserFromStore() {
  try {
    const currentUser = store.get('currentUser');
    const lastLoginAt = store.get('lastLoginAt');
    if (!currentUser) {
      return { success: false, error: 'No user data in store' };
    }
    return { success: true, data: currentUser, lastLoginAt };
  } catch (err) {
    console.error('❌ [electron-store] Lỗi khi đọc:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Xóa thông tin user khỏi electron-store (logout)
 * @returns {{ success: boolean }}
 */
export function clearUserStore() {
  try {
    store.delete('currentUser');
    store.delete('lastLoginAt');
    console.log('🗑️ [electron-store] Đã xóa user data');
    return { success: true };
  } catch (err) {
    console.error('❌ [electron-store] Lỗi khi xóa:', err);
    return { success: false, error: err.message };
  }
}
