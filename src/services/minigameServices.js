import { getValidAccessToken } from './tokenService';
import { store } from '../store';
import { ingestServerData } from './syncService';
const API_URL = import.meta.env.VITE_API_URL;

const handleSyncSudokuLevels = async () => {
    try {
        const { sudokuLevels, sudokuLevelsLastEvaluatedKey } = store.getState().minigame;

        // ==========================================
        // 🛑 CHỐT CHẶN 1: ĐÃ TẢI HẾT DATA
        // ==========================================
        // Nếu đã có data trong Redux VÀ lastEvaluatedKey là null (hoặc undefined) -> Nghĩa là server không còn data nữa.
        if (sudokuLevels && sudokuLevels.length > 0 && !sudokuLevelsLastEvaluatedKey) {
            console.log("Bỏ qua gọi API: Đã hiển thị toàn bộ danh sách, không còn data.");
            return { success: true, levels: sudokuLevels, lastEvaluatedKey: null };
        }

        // ==========================================
        // 🗂️ CHỐT CHẶN 2: LẤY TỪ LOCAL ELECTRON-STORE
        // ==========================================
        // Nếu Redux trống trơn (lần đầu vào app), ưu tiên moi data từ ổ cứng lên trước
        if (!sudokuLevels || sudokuLevels.length === 0) {
            console.log("Redux trống, tiến hành kiểm tra Offline Store...");
            try {
                const localData = await window.api?.invoke('store:loadSudokuLevels');

                if (localData && localData.sudokuLevels && localData.sudokuLevels.length > 0) {
                    console.log("✅ Đã tìm thấy dữ liệu Offline, nạp thẳng vào Redux!");

                    // Nạp vào Redux
                    store.dispatch({
                        type: 'SET_SUDOKU_LEVELS',
                        payload: {
                            sudokuLevels: localData.sudokuLevels,
                            lastEvaluatedKey: localData.lastEvaluatedKey || null
                        }
                    });

                    // Quan trọng: Trả về luôn để CẮT ĐỨT luồng, không cho chạy xuống đoạn gọi server nữa
                    return {
                        success: true,
                        levels: localData.sudokuLevels,
                        lastEvaluatedKey: localData.lastEvaluatedKey || null,
                    };
                } else {
                    console.log("Offline Store trống, bắt buộc phải gọi Server...");
                }
            } catch (localErr) {
                console.error("Lỗi khi đọc Offline Store (Bỏ qua để gọi Server):", localErr);
            }
        }

        // ==========================================
        // 🌐 CHỐT CHẶN 3: GỌI API SERVER (Khi Store rỗng hoặc cần Load More)
        // ==========================================
        console.log("🚀 Tiến hành gọi API Server lấy Sudoku Levels...");
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        let url = `${API_URL}/minigame/sudokulevels`;
        if (sudokuLevelsLastEvaluatedKey) {
            url += `?lastKey=${encodeURIComponent(JSON.stringify(sudokuLevelsLastEvaluatedKey))}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            await ingestServerData(errorData);
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }
        const syncResult = await response.json();

        if (syncResult && syncResult.levels) {
            // Ép lastEvaluatedKey về null nếu API không trả về để chốt chặn 1 hoạt động đúng
            const finalLastKey = syncResult.lastEvaluatedKey || null;

            const payload = {
                sudokuLevels: syncResult.levels,
                lastEvaluatedKey: finalLastKey
            };

            if (sudokuLevelsLastEvaluatedKey) {
                store.dispatch({ type: 'APPEND_SUDOKU_LEVELS', payload });
            } else {
                store.dispatch({ type: 'SET_SUDOKU_LEVELS', payload });
            }

            // Lưu lại vào Electron store để dùng cho lần sau
            await window.api?.invoke('store:saveSudokuLevels', {
                sudokuLevels: syncResult.levels,
                lastEvaluatedKey: finalLastKey,
                isAppend: !!sudokuLevelsLastEvaluatedKey
            }).catch(() => { });
        }

        return syncResult;
    } catch (e) {
        console.error('[syncService] FAIL handleSyncSudokuLevels:', e.message);
        return null;
    }
};
const handleStartSession = async (gameId, levelId) => {
    // [DEBUG] In ra giá trị và kiểu dữ liệu ngay khi hàm được gọi
    console.log(">>> [FRONTEND DEBUG] Đầu vào hàm - gameId:", gameId, "| Type:", typeof gameId);
    console.log(">>> [FRONTEND DEBUG] Đầu vào hàm - levelId:", levelId, "| Type:", typeof levelId);

    try {
        // 1. Lấy state từ Redux
        const state = store.getState();
        const profile = state.profile?.userProfile;

        // 2. Lấy thông tin level (giả sử nằm trong minigameReducer)
        // Nếu không có trong redux, có thể fallback lấy từ window.api (Electron Store)
        let targetLevel = state.minigame?.sudokuLevels?.find(l => l.SK === levelId);

        // 3. Verify nhẹ ở Client (Zero-trust nhẹ)
        if (profile && targetLevel) {
            const currentSanity = profile.budget?.sanity || 0;
            const requiredSanity = targetLevel.sanityCost || 0;

            if (currentSanity < requiredSanity) {
                throw new Error('Not enough sanity to start this level');
            }
        }

        // 4. Gọi lên server dù verify client pass (hoặc client thiếu data)
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        const url = `${API_URL}/minigame/sudokulevels/start-game`;

        // [DEBUG] Gom payload lại và in ra chính xác cục JSON sẽ bắn lên mạng
        const payload = { gameId, levelId };
        console.log(">>> [FRONTEND DEBUG] Payload sẽ gửi đi (Body):", JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            await ingestServerData(errorData);
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const result = await response.json();
        if (!response.ok) await ingestServerData(result);

        // 5. Ingest profile mới nhất (server đã trừ sanity)
        if (result && result.success && result.profile) {
            await ingestServerData({ profile: result.profile });
        }

        // 6. Trả về seed và baseMapConfig cho UI render
        return {
            success: true,
            sessionData: result.sessionData,
            baseMapConfig: result.baseMapConfig
        };

    } catch (error) {
        console.warn('[gameService] FAIL handleStartSession:', error.message);
        throw error;
    }
};
const handleCheckSudokuStep = async (currentGridStr, actionLogs) => {
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        const url = `${API_URL}/minigame/sudokulevels/check`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ currentGrid: currentGridStr, actionLogs })
        });

        const result = await response.json();
        if (!response.ok) await ingestServerData(result);
        if (!response.ok) throw new Error(result.message || 'Lỗi kiểm tra bàn cờ');

        return result;
    } catch (error) {
        console.error('[gameService] FAIL handleCheckSudokuStep:', error.message);
        throw error;
    }
};

const handleSubmitSudoku = async (levelId, finalGridStr, actionLogs, endState = 'win') => {
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        const url = `${API_URL}/minigame/sudokulevels/end-session`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ levelId, finalGrid: finalGridStr, actionLogs, endState })
        });

        const result = await response.json();

        if (result.success) {
            // 1. Cập nhật Profile (eCoin, sanity...)
            if (result.profile) {
                await ingestServerData({ profile: result.profile });
            }

            // 2. Cập nhật danh sách Level mới nhất vào Redux và Electron Store
            if (result.levels && result.levels.length > 0) {
                // Đảm bảo biến payload được khai báo BÊN TRONG khối if này
                const payload = {
                    sudokuLevels: result.levels,
                    lastEvaluatedKey: result.lastEvaluatedKey || null
                };

                // Đẩy vào Redux
                store.dispatch({ type: 'SET_SUDOKU_LEVELS', payload });

                // Lưu vào Electron Store (Offline)
                await window.api?.invoke('store:saveSudokuLevels', {
                    sudokuLevels: result.levels,
                    lastEvaluatedKey: result.lastEvaluatedKey || null,
                    isAppend: false
                }).catch((err) => {
                    console.error('[gameService] Lỗi khi lưu offline levels:', err);
                });
            }
        }

        return result;
    } catch (error) {
        console.error('[gameService] FAIL handleSubmitSudoku:', error.message);
        throw error; // Ném lỗi ra ngoài để SudokuGame.jsx bắt được bằng catch (e)
    }
};

export { handleSyncSudokuLevels, handleStartSession, handleCheckSudokuStep, handleSubmitSudoku };
