import { signOut } from 'aws-amplify/auth';
import { store } from '../store';
import { logoutClearData } from '../store/actions';
import { handleSyncProfileApi } from './syncService';
import { clearCachedAccessToken } from './tokenService';
let handleLoginApi = async () => {
  try {
    const syncResult = await handleSyncProfileApi();
    if (!syncResult || !syncResult.success || !syncResult.profile) {
      console.error('Không lấy được thông tin user từ API syncProfile:', syncResult?.error || 'No profile data returned');
      await handleLogoutApi();
      throw new Error(syncResult?.error || 'Failed to retrieve user data from API syncProfile');
    }
  } catch (error) {
    console.error('Lỗi khi load thông tin user:', error);
    throw error;
  }
};

let handleLogoutApi = async ({ resizeWindow = true } = {}) => {
  try {
    await signOut().catch((err) => {
      console.warn('[AuthService] signOut failed, clearing local session anyway:', err?.message || err);
    });
  } finally {
    clearCachedAccessToken();
    localStorage.setItem('manualLogoutAt', String(Date.now()));
    await window.api?.invoke('store:clearLoginData').catch((err) => {
      console.warn('[AuthService] clearLoginData failed:', err?.message || err);
    });
    store.dispatch(logoutClearData());
    if (resizeWindow) window.api?.send('logout');
  }
}

export {
  handleLoginApi,
  handleLogoutApi,
};
