import { fetchAuthSession } from 'aws-amplify/auth';

export const getValidIdToken = async () => {
    try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (!idToken) {
            console.warn('[AuthHelper] Không tìm thấy Token hợp lệ.');
            return null;
        }
        return idToken;
    } catch (error) {
        console.error('[AuthHelper] Lỗi khi lấy session xác thực:', error);
        return null;
    }
};