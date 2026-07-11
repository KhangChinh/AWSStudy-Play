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
        await handleSyncInventoryApi(normalizedType);

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

export {
    updateProfileNameApi,
    getInventoryItem
};
