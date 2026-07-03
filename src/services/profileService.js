import { getValidAccessToken } from './tokenService';
import { ingestServerData } from './syncService';

const API_URL = import.meta.env.VITE_API_URL;

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
            const errorData = await response.json().catch(() => ({}));
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

export {
    updateProfileNameApi
}