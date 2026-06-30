import { signOut } from 'aws-amplify/auth';
<<<<<<< HEAD
import { store } from '';
=======
import { store } from '../store';
>>>>>>> 72ebd4bc293783fe4dbdfab2f8dd412fb7556921
import { clearProfile } from '../store/actions';
import { handleSyncProfileApi } from './syncService';
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

let handleLogoutApi = async () => {
  try {
    await signOut();
    await window.api?.invoke('store:clearLoginData');
    store.dispatch(clearProfile());
    window.api?.send('logout');
  } catch (err) {
    console.error('[AuthService] Lỗi khi logout:', err);
  }
}

export {
  handleLoginApi,
  handleLogoutApi,
};
