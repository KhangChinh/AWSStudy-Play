import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { store } from '../store';
import { logoutClearData } from '../store/actions';

let currentAccessToken = null;

function isTokenExpiringSoon(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payloadBase64 = parts[1];
    const decodedJson = atob(payloadBase64);
    const payload = JSON.parse(decodedJson);
    if (!payload.exp) return true;
    const expirationTimeMs = payload.exp * 1000;
    const timeRemainingMs = expirationTimeMs - Date.now();
    return timeRemainingMs < 5 * 60 * 1000;
  } catch (error) {
    console.error('[TokenService] Lỗi parse token:', error);
    return true;
  }
}

async function triggerLogout() {
  console.warn('[TokenService] Token hết hạn hoàn toàn. Đang tự động đăng xuất...');
  currentAccessToken = null;
  localStorage.setItem('manualLogoutAt', String(Date.now()));
  try {
    await signOut().catch(() => { });
    window.api?.send('logout');
    await window.api?.invoke('store:clearLoginData').catch(() => { });
    store.dispatch(logoutClearData());
  } catch (error) {
    console.error('[TokenService] Lỗi khi forced logout:', error);
  }
}

async function initializeAuth() {
  try {
    const session = await fetchAuthSession();
    const newToken =
      session.tokens?.idToken?.toString() ||
      session.tokens?.accessToken?.toString();
    if (newToken) {
      currentAccessToken = newToken;
      window.api?.invoke('auth:save-token', newToken).catch(() => { });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[TokenService] Không tìm thấy phiên đăng nhập hợp lệ:', error);
    currentAccessToken = null;
    return false;
  }
}

function getValidToken() {
  return currentAccessToken;
}

function clearCachedAccessToken() {
  currentAccessToken = null;
}

async function getValidAccessToken() {
  let token = currentAccessToken;
  if (!token || isTokenExpiringSoon(token)) {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const newToken =
        session.tokens?.idToken?.toString() ||
        session.tokens?.accessToken?.toString();
      if (newToken) {
        currentAccessToken = newToken;
        token = newToken;
        window.api?.invoke('auth:save-token', newToken).catch(() => { });
      } else {
        await triggerLogout();
        return null;
      }
    } catch (error) {
      const isNetworkError = error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('fetch') ||
        !navigator.onLine;
      if (!isNetworkError) {
        await triggerLogout();
      }
      return null;
    }
  }
  return token;
}

export {
  isTokenExpiringSoon,
  triggerLogout,
  initializeAuth,
  getValidToken,
  clearCachedAccessToken,
  getValidAccessToken,
}
