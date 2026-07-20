import { getValidAccessToken } from './tokenService';
import { store } from '../store';
import { ingestServerData } from './syncService';
const API_URL = import.meta.env.VITE_API_URL;

const handleSyncMinesweeperLevels = async () => {
    try {
        const { minesweeperLevels, minesweeperLevelsLastEvaluatedKey } = store.getState().minigame;

        // 🛑 CHỐT CHẶN 1: ĐÃ TẢI HẾT DATA
        if (minesweeperLevels && minesweeperLevels.length > 0 && !minesweeperLevelsLastEvaluatedKey) {
            console.log("Bỏ qua gọi API: Đã hiển thị toàn bộ danh sách, không còn data.");
            return { success: true, levels: minesweeperLevels, lastEvaluatedKey: null };
        }

        // 🗂️ CHỐT CHẶN 2: LẤY TỪ LOCAL ELECTRON-STORE
        if (!minesweeperLevels || minesweeperLevels.length === 0) {
            console.log("Redux trống, tiến hành kiểm tra Offline Store...");
            try {
                const localData = await window.api?.invoke('store:loadMinesweeperLevels');

                if (localData && localData.minesweeperLevels && localData.minesweeperLevels.length > 0) {
                    console.log("✅ Đã tìm thấy dữ liệu Offline, nạp thẳng vào Redux!");

                    store.dispatch({
                        type: 'SET_MINESWEEPER_LEVELS',
                        payload: {
                            minesweeperLevels: localData.minesweeperLevels,
                            lastEvaluatedKey: localData.lastEvaluatedKey || null
                        }
                    });

                    return {
                        success: true,
                        levels: localData.minesweeperLevels,
                        lastEvaluatedKey: localData.lastEvaluatedKey || null,
                    };
                } else {
                    console.log("Offline Store trống, bắt buộc phải gọi Server...");
                }
            } catch (localErr) {
                console.error("Lỗi khi đọc Offline Store (Bỏ qua để gọi Server):", localErr);
            }
        }

        // 🌐 CHỐT CHẶN 3: GỌI API SERVER
        console.log("🚀 Tiến hành gọi API Server lấy Minesweeper Levels...");
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        let url = `${API_URL}/minigame/minesweeperlevels`;
        if (minesweeperLevelsLastEvaluatedKey) {
            url += `?lastKey=${encodeURIComponent(JSON.stringify(minesweeperLevelsLastEvaluatedKey))}`;
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
            const finalLastKey = syncResult.lastEvaluatedKey || null;

            const payload = {
                minesweeperLevels: syncResult.levels,
                lastEvaluatedKey: finalLastKey
            };

            if (minesweeperLevelsLastEvaluatedKey) {
                store.dispatch({ type: 'APPEND_MINESWEEPER_LEVELS', payload });
            } else {
                store.dispatch({ type: 'SET_MINESWEEPER_LEVELS', payload });
            }

            await window.api?.invoke('store:saveMinesweeperLevels', {
                minesweeperLevels: syncResult.levels,
                lastEvaluatedKey: finalLastKey,
                isAppend: !!minesweeperLevelsLastEvaluatedKey
            }).catch(() => { });
        }

        return syncResult;
    } catch (e) {
        console.error('[syncService] FAIL handleSyncMinesweeperLevels:', e.message);
        return null;
    }
};

const handleStartMinesweeperSession = async (gameId, levelId) => {
    // [DEBUG] In ra giá trị và kiểu dữ liệu ngay khi hàm được gọi
    console.log(">>> [FRONTEND DEBUG] Đầu vào hàm - gameId:", gameId, "| Type:", typeof gameId);
    console.log(">>> [FRONTEND DEBUG] Đầu vào hàm - levelId:", levelId, "| Type:", typeof levelId);

    try {
        // 1. Lấy state từ Redux
        const state = store.getState();
        const profile = state.profile?.userProfile;

        // 2. Lấy thông tin level (giả sử nằm trong minigameReducer)
        // Nếu không có trong redux, có thể fallback lấy từ window.api (Electron Store)
        let targetLevel = state.minigame?.minesweeperLevels?.find(l => l.SK === levelId);

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

        const url = `${API_URL}/minigame/minesweeperlevels/start-game`;

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
        console.warn('[gameService] FAIL handleStartMinesweeperSession:', error.message);
        throw error;
    }
};

const handleRevealApi = async (row, col, gameStateToken) => {
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        const url = `${API_URL}/minigame/minesweeper/reveal`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ row, col, gameStateToken })
        });

        const result = await response.json();
        if (!response.ok) await ingestServerData(result);
        if (!response.ok) throw new Error(result.message || 'Lỗi kiểm tra bàn cờ');

        return result;
    } catch (error) {
        console.error('[gameService] FAIL handleRevealApi:', error.message);
        throw error;
    }
};

const handleSubmitMinesweeper = async (levelId, finalGridStr, actionLogs, endState) => {
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        const url = `${API_URL}/minigame/minesweeperlevels/end-session`;
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
            if (result.profile) {
                await ingestServerData({ profile: result.profile });
            }

            if (result.levels && result.levels.length > 0) {
                const payload = {
                    minesweeperLevels: result.levels,
                    lastEvaluatedKey: result.lastEvaluatedKey || null
                };

                store.dispatch({ type: 'SET_MINESWEEPER_LEVELS', payload });

                await window.api?.invoke('store:saveMinesweeperLevels', {
                    minesweeperLevels: result.levels,
                    lastEvaluatedKey: result.lastEvaluatedKey || null,
                    isAppend: false
                }).catch((err) => {
                    console.error('[gameService] Lỗi khi lưu offline levels:', err);
                });
            }
        }

        return result;
    } catch (error) {
        console.error('[gameService] FAIL handleSubmitMinesweeper:', error.message);
        throw error;
    }
};

export {
    handleSyncMinesweeperLevels,
    handleRevealApi,
    handleStartMinesweeperSession,
    handleSubmitMinesweeper
};
