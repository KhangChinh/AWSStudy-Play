export const MINIGAME_CLEAR_LOGS = 'MINIGAME_CLEAR_LOGS';
export const MINIGAME_ADD_LOG = 'MINIGAME_ADD_LOG';
export const MINIGAME_SAVE_FINAL_RESULT = 'MINIGAME_SAVE_FINAL_RESULT';

// ==========================================
// ACTION CREATORS
// ==========================================

// Xóa toàn bộ log (dùng khi bắt đầu màn chơi mới)
export const clearMinigameLogs = () => ({
    type: MINIGAME_CLEAR_LOGS,
});

// Thêm một log hành động mới
export const addMinigameLog = (payload) => ({
    type: MINIGAME_ADD_LOG,
    payload, // payload = { gameId, row, col, action, value, timestamp }
});

// Lưu kết quả test giả lập
export const saveMinigameFinalResult = (payload) => ({
    type: MINIGAME_SAVE_FINAL_RESULT,
    payload,
});