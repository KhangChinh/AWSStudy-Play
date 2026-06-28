import { getValidIdToken } from './authHelper';
// CHUYỂN QUA PROFILE SERVICE, GIỮ ĐỂ BIẾT CÒN CẦN CHỨC NĂNG NÀY
const API_URL = import.meta.env.VITE_API_URL;

const getAvatarUploadUrl = async (fileName, fileType) => {
  try {
    const idToken = await getValidIdToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/get-upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName, fileType }),
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const updateAvatarUrl = async (avatarUrl) => {
  try {
    const idToken = await getValidIdToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/update-avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avatarUrl }),
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
};



export {
  getAvatarUploadUrl,
  updateAvatarUrl,
};