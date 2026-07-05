import { getValidAccessToken } from './tokenService';
import { store } from '../store';

const API_URL = import.meta.env.VITE_API_URL;
const handleSyncSudokuLevels = async () => {
    try {
        const { sudokuLevels, sudokuLevelsLastEvaluatedKey, sudokuLevelsHasMore } = store.getState().sudokuLevels;
        if (!sudokuLevelsHasMore) return null;
        if (sudokuLevels.length === 0) {
            const localData = await window.api?.invoke('store:loadSudokuLevels').catch(() => null);
            if (localData && localData.sudokuLevels && localData.sudokuLevels.length > 0) {
                store.dispatch({
                    type: 'SET_SUDOKU_LEVELS',
                    payload: {
                        items: localData.sudokuLevels,
                        lastKey: localData.lastEvaluatedKey
                    }
                });
                return {
                    success: true,
                    sudokuLevels: localData.sudokuLevels,
                    lastEvaluatedKey: localData.lastEvaluatedKey,
                };
            }
        }
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');
        let url = `${API_URL}/sync-sudoku-levels`;
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
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const syncResult = await response.json();
        if (syncResult && syncResult.success && syncResult.sudokuLevels) {
            const payload = { items: syncResult.sudokuLevels, lastKey: syncResult.lastEvaluatedKey };
            if (sudokuLevelsLastEvaluatedKey) store.dispatch({ type: 'APPEND_SUDOKU_LEVELS', payload });
            else store.dispatch({ type: 'SET_SUDOKU_LEVELS', payload });
            await window.api?.invoke('store:saveSudokuLevels', {
                sudokuLevels: syncResult.sudokuLevels,
                lastEvaluatedKey: syncResult.lastEvaluatedKey,
                isAppend: !!sudokuLevelsLastEvaluatedKey
            }).catch(() => { });
        }
        return syncResult;
    } catch (e) {
        console.warn('[syncService] FAIL handleSyncSudokuLevels:', e.message);
        return null;
    }
};

const handleSyncGameResultApi = async (payload) => {
    try {
        const token = await getValidAccessToken();
        if (!token) throw new Error('No auth token');

        const response = await fetch(`${API_URL}/minigame/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                gameId: payload.gameId || payload.minigame,
                gameToken: payload.gameToken,
                finalGrid: payload.finalGrid,
                actionLog: payload.actionLog || [],
            }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.errCode) {
            throw new Error(result.errMessage || result.message || `API Error: ${response.status}`);
        }

        return { errCode: 0, ...result };
    } catch (e) {
        console.warn('[minigameServices] FAIL handleSyncGameResultApi:', e.message);
        return { errCode: -1, errMessage: e.message };
    }
};
export { handleSyncSudokuLevels, handleSyncGameResultApi };