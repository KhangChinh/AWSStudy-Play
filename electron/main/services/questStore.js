/**
 * Quest Store — Lưu/đọc daily quests vào electron-store dưới dạng base64
 * Dùng electron-store riêng (tách biệt với secureStore).
 */

import Store from 'electron-store';

const store = new Store({
  name: 'quest-store',
});

/**
 * Lưu daily quests vào store dưới dạng base64
 * @param {object} data — daily quest object từ server
 * @returns {{ success: boolean, error?: string }}
 */
export function saveQuestsToStore(data) {
  try {
    const json = JSON.stringify(data);
    const base64 = Buffer.from(json, 'utf-8').toString('base64');
    store.set('daily_quests', base64);
    return { success: true };
  } catch (err) {
    console.error('[QuestStore] Lỗi khi save:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Đọc daily quests từ store (decode base64 → JSON)
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export function loadQuestsFromStore() {
  try {
    const base64 = store.get('daily_quests');
    if (!base64) return { success: true, data: null };
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const data = JSON.parse(json);
    return { success: true, data };
  } catch (err) {
    console.error('[QuestStore] Lỗi khi load:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Xóa daily quests khỏi store
 * @returns {{ success: boolean, error?: string }}
 */
export function clearQuestsStore() {
  try {
    store.delete('daily_quests');
    return { success: true };
  } catch (err) {
    console.error('[QuestStore] Lỗi khi clear:', err);
    return { success: false, error: err.message };
  }
}
