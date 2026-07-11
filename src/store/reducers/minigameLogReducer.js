import {
    MINIGAME_CLEAR_LOGS,
    MINIGAME_ADD_LOG,
    MINIGAME_SAVE_FINAL_RESULT
} from '../actions/minigameLogActions';
const initialState = {
    actionLogs: [],
    finalResult: null
};

const minigameLogsReducer = (state = initialState, action) => {
    switch (action.type) {
        case MINIGAME_CLEAR_LOGS:
            // Gọi khi bắt đầu BẤT KỲ màn chơi minigame nào
            return {
                ...state,
                actionLogs: [],
                finalResult: null
            };
        case MINIGAME_ADD_LOG: {
            const newLog = action.payload;

            // Tìm vị trí của log cũ dựa trên tọa độ row và col
            const existingLogIndex = state.actionLogs.findIndex(
                log => log.row === newLog.row && log.col === newLog.col
            );

            let updatedLogs = [...state.actionLogs];

            if (existingLogIndex !== -1) {
                // NẾU ĐÃ TỒN TẠI: Ghi đè log cũ bằng hành động mới nhất tại ô này
                updatedLogs[existingLogIndex] = newLog;
            } else {
                // NẾU CHƯA TỒN TẠI: Thêm log mới vào cuối mảng
                updatedLogs.push(newLog);
            }

            return {
                ...state,
                actionLogs: updatedLogs
            };
        }
        case MINIGAME_SAVE_FINAL_RESULT:
            return {
                ...state,
                finalResult: action.payload
            };
        default:
            return state;
    }
};
export default minigameLogsReducer;