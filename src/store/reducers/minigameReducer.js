import {
    SET_SUDOKU_LEVELS, APPEND_SUDOKU_LEVELS, SET_LEADERBOARD, CLEAR_SUDOKU_LEVELS,
    SET_MINESWEEPER_LEVELS, APPEND_MINESWEEPER_LEVELS, CLEAR_MINESWEEPER_LEVELS
} from '../actions/minigameActions';

const initialState = {
    sudokuLevels: [],
    sudokuLevelsLastEvaluatedKey: null,
    minesweeperLevels: [],
    minesweeperLevelsLastEvaluatedKey: null,
    isLoading: false,
    leaderboards: {
        sudoku: {
            data: [],
            expiresAt: null
        },
        minesweeper: {
            data: [],
            expiresAt: null
        }
    }
};

const minigameReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_SUDOKU_LEVELS:
            return {
                ...state,
                sudokuLevels: action.payload.sudokuLevels || [],
                sudokuLevelsLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
                isLoading: false,
            };
        case APPEND_SUDOKU_LEVELS:
            return {
                ...state,
                sudokuLevels: [...state.sudokuLevels, ...(action.payload.sudokuLevels || [])],
                sudokuLevelsLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
                isLoading: false,
            };
        case SET_MINESWEEPER_LEVELS:
            return {
                ...state,
                minesweeperLevels: action.payload.minesweeperLevels || [],
                minesweeperLevelsLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
                isLoading: false,
            };
        case APPEND_MINESWEEPER_LEVELS:
            return {
                ...state,
                minesweeperLevels: [...state.minesweeperLevels, ...(action.payload.minesweeperLevels || [])],
                minesweeperLevelsLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
                isLoading: false,
            };
        case SET_LEADERBOARD:
            return {
                ...state,
                leaderboards: {
                    ...state.leaderboards,
                    [action.payload.gameId]: {
                        data: action.payload.data,
                        expiresAt: action.payload.expiresAt // Cập nhật expiresAt
                    }
                }
            };
        case CLEAR_SUDOKU_LEVELS:
            return {
                ...state,
                sudokuLevels: [],
                sudokuLevelsLastEvaluatedKey: null
            };
        case CLEAR_MINESWEEPER_LEVELS:
            return {
                ...state,
                minesweeperLevels: [],
                minesweeperLevelsLastEvaluatedKey: null
            };

        default:
            return state;
    }
};


export default minigameReducer;