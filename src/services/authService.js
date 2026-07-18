import { signOut } from 'aws-amplify/auth';
import { store } from '../store';
import { logoutClearData } from '../store/actions';
import { handleSyncAllApi } from './syncService';
import { clearCachedAccessToken } from './tokenService';
let handleLoginApi = async () => {
  try {
    const syncResult = await handleSyncAllApi({
      force: true,
      sections: ['profile', 'daily'],
    });
    const profile = syncResult?.profile || store.getState().profile?.userProfile;
    if (!profile) {
      console.error('[AuthService] Cannot load user profile from syncAll:', syncResult?.error || 'No profile data returned');
      await handleLogoutApi();
      throw new Error(syncResult?.error || 'Failed to retrieve user data from API syncAll');
    }
  } catch (error) {
    console.error('Lỗi khi load thông tin user:', error);
    throw error;
  }
};

let handleLogoutApi = async () => {
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
    window.api?.send('logout');
  }
}

export {
  handleLoginApi,
  handleLogoutApi,
};
