export const SET_SUDOKU_LEVELS = 'SET_SUDOKU_LEVELS';
export const APPEND_SUDOKU_LEVELS = 'APPEND_SUDOKU_LEVELS';
export const CLEAR_SUDOKU_LEVELS = 'CLEAR_SUDOKU_LEVELS';

export const setSudokuLevels = (payload) => ({
    type: SET_SUDOKU_LEVELS,
    payload, // payload = { items: [], lastKey: ... }
});

export const appendSudokuLevels = (payload) => ({
    type: APPEND_SUDOKU_LEVELS,
    payload,
});

export const clearSudokuLevels = () => ({
    type: CLEAR_SUDOKU_LEVELS,
});