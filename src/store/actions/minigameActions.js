export const SET_SUDOKU_LEVELS = 'SET_SUDOKU_LEVELS';
export const APPEND_SUDOKU_LEVELS = 'APPEND_SUDOKU_LEVELS';
export const CLEAR_SUDOKU_LEVELS = 'CLEAR_SUDOKU_LEVELS';
export const SET_LEADERBOARD = 'SET_LEADERBOARD';

export const SET_MINESWEEPER_LEVELS = 'SET_MINESWEEPER_LEVELS';
export const APPEND_MINESWEEPER_LEVELS = 'APPEND_MINESWEEPER_LEVELS';
export const CLEAR_MINESWEEPER_LEVELS = 'CLEAR_MINESWEEPER_LEVELS';

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

export const setLeaderboard = (payload) => ({
    type: SET_LEADERBOARD,
    payload,
});

export const setMinesweeperLevels = (payload) => ({
    type: SET_MINESWEEPER_LEVELS,
    payload,
});

export const appendMinesweeperLevels = (payload) => ({
    type: APPEND_MINESWEEPER_LEVELS,
    payload,
});

export const clearMinesweeperLevels = () => ({
    type: CLEAR_MINESWEEPER_LEVELS,
});

