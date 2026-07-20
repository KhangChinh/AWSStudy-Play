import { getValidAccessToken } from './tokenService';
import { ingestServerData, handleSyncInventoryApi } from './syncService';
import { ingestErrorResponse } from './apiErrorService';
import { store } from '../store';

const API_URL = import.meta.env.VITE_API_URL;

const normalizeInventoryType = (itemType) => {
    const aliases = {
        backgrounds: 'background',
        frames: 'frame',
        titles: 'title',
        buttons: 'button',
        themes: 'theme',
        systemIcons: 'systemIcon',
        system_icons: 'systemIcon',
        pets: 'pet',
    };
    return aliases[itemType] || itemType;
};

const updateProfileNameApi = async (newName) => {
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');
        const url = `${API_URL}/update-profile`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name: newName }),
        });
        if (!response.ok) {
            const errorData = await ingestErrorResponse(response);
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }
        const result = await response.json();
        if (result && result.success && result.profile) {
            await ingestServerData(result);
        }
        return result;
    } catch (error) {
        console.warn('[profileService] FAIL updateUserNameApi:', error.message);
        throw error;
    }
};

const getInventoryItem = async (itemType) => {
    const normalizedType = normalizeInventoryType(itemType);
    if (!normalizedType) return { success: false, message: 'Missing itemType' };

    try {
        await handleSyncInventoryApi(normalizedType, { force: true });

        let pageCount = 0;
        while ((store.getState().inventory || {})[normalizedType]?.lastKey && pageCount < 100) {
            await handleSyncInventoryApi(normalizedType);
            pageCount += 1;
        }

        const typeState = (store.getState().inventory || {})[normalizedType];
        const inventory = Array.isArray(typeState?.items) ? typeState.items : [];

        return {
            success: true,
            inventory,
            lastEvaluatedKey: typeState?.lastKey || null,
            hasMore: typeState?.hasMore ?? false,
        };
    } catch (error) {
        console.warn(`[profileService] FAIL getInventoryItem (${normalizedType}):`, error.message);
        return { success: false, inventory: [], lastEvaluatedKey: null, hasMore: false, message: error.message };
    }
};

const uploadAvatarApi = async (file) => {
    // 1. Kiểm tra File size (Giới hạn 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error('Ảnh quá nặng, vui lòng chọn ảnh dưới 2MB.');
    }

    // 2. Kiểm tra ngân sách (Frontend check nhẹ)
    const currentProfile = store.getState().profile?.userProfile;
    if (!currentProfile || !currentProfile.budget || currentProfile.budget.eCoin < 500) {
        throw new Error('Không đủ eCoin để đổi ảnh đại diện (Cần 500 eCoin).');
    }

    try {
        // 3. Chuyển file sang Base64
        const base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // Chỉ lấy phần data, bỏ prefix 'data:image/jpeg;base64,'
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        // 4. Gọi API
        const token = await getValidAccessToken();
        const url = `${API_URL}/update-avatar`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                imageBody: base64Image,
                contentType: file.type // ví dụ: 'image/jpeg' hoặc 'image/png'
            }),
        });

        if (!response.ok) {
            const errorData = await ingestErrorResponse(response);
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const result = await response.json();

        // 5. Cập nhật lại Store bằng profile mới từ server (nếu bị lỗi tiền trên server nó vẫn trả về profile cũ)
        if (result && result.profile) {
            await ingestServerData(result);
        }

        return result;
    } catch (error) {
        console.warn('[profileService] FAIL uploadAvatarApi:', error.message);
        throw error;
    }
};

export {
    updateProfileNameApi,
    getInventoryItem,
    uploadAvatarApi,
};
