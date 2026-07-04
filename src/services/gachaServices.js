import { store } from '../store';
import { getValidAccessToken } from './tokenService';
import { ingestServerData } from './syncService';

const API_URL = import.meta.env.VITE_API_URL;

export const handleGachaAction = async (isx10) => {
  try {
    const costCore = isx10 ? 10 : 1;
    let profile = store.getState().profile?.userProfile;
    if (!profile) {
      profile = await window.api?.invoke('store:loadProfile');
    }
    if (profile?.budget) {
      const { knowledgeCore = 0, knowledgePoint = 0 } = profile.budget;
      if (knowledgeCore < costCore) {
        const missingCores = costCore - knowledgeCore;
        const requiredPoints = missingCores * 150;

        if (knowledgePoint < requiredPoints) {
          throw new Error(`Bạn cần tối thiểu ${costCore} Knowledge Core (hoặc quy đổi ${requiredPoints} Knowledge Point) để thực hiện!`);
        }
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('Không có quyền truy cập. Vui lòng đăng nhập lại.');
    const response = await fetch(`${API_URL}/gacha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isx10 })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Lỗi máy chủ (${response.status})`);
    }
    const result = await response.json();
    if (result && result.success) {
      await ingestServerData({
        profile: result.profile,
        inventory: result.inventory,
        inventoryLastKey: result.inventoryLastKey,
        gachaHistory: result.gachaHistory,
      });

      // Trả kết quả trực quan (hình ảnh + tên) về cho giao diện render
      return result.pulledItems;
    }

    throw new Error('Gacha không thành công.');
  } catch (error) {
    console.error('[GachaService] Lỗi Gacha:', error.message);
    throw error;
  }
};