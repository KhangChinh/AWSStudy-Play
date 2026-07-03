/**
 * Auth Helper — Mã hóa JWT Token bằng safeStorage (DPAPI / Keychain)
 * 
 * Token được mã hóa bằng API hệ điều hành, lưu dưới dạng file .bin
 * → Không thể đọc được nếu không có quyền OS-level
 */

import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const TOKEN_FILE = 'refresh_token.bin';

function getTokenPath() {
  const dir = path.join(app.getPath('userData'), 'security');
  // Đảm bảo thư mục tồn tại
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, TOKEN_FILE);
}

/**
 * Mã hóa và lưu RefreshToken xuống file .bin
 * @param {string} token - JWT RefreshToken từ Cognito
 * @returns {{ success: boolean, error?: string }}
 */
export function saveToken(token) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, error: 'Encryption not available on this OS' };
    }
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getTokenPath(), encrypted);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Giải mã RefreshToken từ file .bin
 * @returns {{ success: boolean, token?: string, error?: string }}
 */
export function loadToken() {
  try {
    const tokenPath = getTokenPath();
    if (!fs.existsSync(tokenPath)) {
      return { success: false, error: 'No saved token found' };
    }
    const encrypted = fs.readFileSync(tokenPath);
    const token = safeStorage.decryptString(encrypted);
    return { success: true, token };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Xóa token đã lưu (logout)
 * @returns {{ success: boolean }}
 */
export function clearToken() {
  try {
    const tokenPath = getTokenPath();
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
