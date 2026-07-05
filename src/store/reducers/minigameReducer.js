import { SET_SUDOKU_LEVELS, APPEND_SUDOKU_LEVELS, CLEAR_SUDOKU_LEVELS } from '../actions/minigameActions';

const initialState = {
    sudokuLevels: [],
    sudokuLevelsLastEvaluatedKey: null,
    isLoading: false,
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
        case CLEAR_SUDOKU_LEVELS:
            return initialState;

        default:
            return state;
    }
};

export default minigameReducer;