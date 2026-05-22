import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  closeOutline, refreshOutline, pauseOutline, playOutline,
  pencilOutline, trashOutline, helpCircleOutline, arrowBackOutline,
  trophyOutline, heartOutline, timeOutline, alertCircleOutline
} from 'ionicons/icons';
import { toast } from 'react-toastify';
import { setEconomy, setHighscores } from '../../store/actions';
import { handleSyncGameResultApi } from '../../services/economyServices';
import './SudokuGame.scss';

// ═══ Sudoku Solver & Generator Helpers ═══

const isValid = (board, row, col, num) => {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
};

const solveSudoku = (board) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

const generateNewGame = (difficulty) => {
  const solution = Array(9).fill(null).map(() => Array(9).fill(0));
  solveSudoku(solution);

  const board = solution.map(row => [...row]);

  let removeCount = 1; // Easy
  if (difficulty === 'medium') removeCount = 48;
  else if (difficulty === 'hard') removeCount = 54;
  else if (difficulty === 'expert') removeCount = 58;

  let removed = 0;
  while (removed < removeCount) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (board[row][col] !== 0) {
      board[row][col] = 0;
      removed++;
    }
  }

  return {
    solution,
    initialBoard: board.map(row => [...row]),
    board: board.map(row => [...row]),
  };
};
const MAX_P = {
  easy: 5000,
  medium: 10000,
  hard: 20000,
  expert: 40000
}
const MIN_P = {
  easy: 500,
  medium: 1000,
  hard: 2000,
  expert: 4000
}
// Rank points calculation helper depending on difficulty and time spent
const calculateRankPoints = (difficulty, time) => {
  if (difficulty === 'easy') {
    if (time <= 600) return MAX_P.easy;
    const extraMins = Math.floor((time - 600) / 60) + 1;
    return Math.max(MIN_P.easy, MAX_P.easy - extraMins * 500);
  } else if (difficulty === 'medium') {
    if (time <= 900) return MAX_P.medium;
    const extraMins = Math.floor((time - 900) / 60) + 1;
    return Math.max(MIN_P.medium, MAX_P.medium - extraMins * 800);
  } else if (difficulty === 'hard') {
    if (time <= 1200) return MAX_P.hard;
    const extraMins = Math.floor((time - 1200) / 60) + 1;
    return Math.max(MIN_P.hard, MAX_P.hard - extraMins * 1500);
  } else if (difficulty === 'expert') {
    if (time <= 1500) return MAX_P.expert;
    const extraMins = Math.floor((time - 1500) / 60) + 1;
    return Math.max(MIN_P.expert, MAX_P.expert - extraMins * 2500);
  }
  return MIN_P.easy;
};

const SudokuGame = ({ onClose }) => {
  const dispatch = useDispatch();
  const economy = useSelector(state => state.economy || { pCoins: 0 });
  const minigameHighscores = useSelector(state => state.minigameHighscores || {});

  // Game configuration & status
  const [difficulty, setDifficulty] = useState('easy');
  const [isSelectingDifficulty, setIsSelectingDifficulty] = useState(true);

  const [board, setBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [notes, setNotes] = useState(Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(9).fill(false))));

  const [selectedCell, setSelectedCell] = useState(null); // { row, col }
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState('paused'); // 'playing', 'paused', 'won', 'lost'
  const [timer, setTimer] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [history, setHistory] = useState([]); // Stack of board states for Undo

  // ═══ Timer Effect ═══
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // ═══ Initialize Game ═══
  const initGame = (selectedDifficulty) => {
    const game = generateNewGame(selectedDifficulty);
    setBoard(game.board);
    setInitialBoard(game.initialBoard);
    setSolution(game.solution);
    // Reset all notes to empty (9x9 grid of 9x array of false)
    setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(9).fill(false))));
    setMistakes(0);
    setTimer(0);
    setHintsLeft(3);
    setHistory([]);
    setSelectedCell(null);
    setIsSelectingDifficulty(false);
    setStatus('playing');
    toast.info(`Game Sudoku (${selectedDifficulty.toUpperCase()}) bắt đầu!`);
  };

  const handleDifficultySelect = (diff) => {
    setDifficulty(diff);
    initGame(diff);
  };

  // Format Time
  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══ Input Actions ═══

  const handleCellClick = (row, col) => {
    if (status !== 'playing') return;
    setSelectedCell({ row, col });
  };

  // Handles updating the cell with a number (1-9)
  const inputNumber = useCallback((num) => {
    if (status !== 'playing' || !selectedCell) return;
    const { row, col } = selectedCell;

    // Check if cell is pre-filled/locked
    if (initialBoard[row][col] !== 0) return;

    // Save history for Undo before modification
    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(r => r.map(c => [...c]))
    }]);

    if (isNoteMode) {
      // Notes mode: toggle note value
      const updatedNotes = notes.map((r, rIdx) =>
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            const nextNote = [...c];
            nextNote[num - 1] = !nextNote[num - 1];
            return nextNote;
          }
          return c;
        })
      );
      setNotes(updatedNotes);

      // Clear value from cell if in notes mode
      const updatedBoard = board.map((r, rIdx) =>
        r.map((val, cIdx) => (rIdx === row && cIdx === col ? 0 : val))
      );
      setBoard(updatedBoard);
    } else {
      // Normal mode: put number in cell
      const isCorrect = num === solution[row][col];

      // Update cell value
      const updatedBoard = board.map((r, rIdx) =>
        r.map((val, cIdx) => (rIdx === row && cIdx === col ? num : val))
      );
      setBoard(updatedBoard);

      // Clear notes in this cell since we filled it
      const updatedNotes = notes.map((r, rIdx) =>
        r.map((c, cIdx) => (rIdx === row && cIdx === col ? Array(9).fill(false) : c))
      );
      setNotes(updatedNotes);

      if (!isCorrect) {
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);
        toast.error(`Sai luật! (Lần sai thứ ${nextMistakes})`);
      } else {
        // Correct entry, check if won!
        checkWin(updatedBoard);
      }
    }
  }, [board, notes, selectedCell, status, isNoteMode, solution, mistakes, initialBoard]);

  // Erase current cell
  const eraseCell = () => {
    if (status !== 'playing' || !selectedCell) return;
    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) return; // Locked

    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(r => r.map(c => [...c]))
    }]);

    const updatedBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? 0 : val))
    );
    setBoard(updatedBoard);

    const updatedNotes = notes.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? Array(9).fill(false) : c))
    );
    setNotes(updatedNotes);
  };

  // Undo last move
  const handleUndo = () => {
    if (status !== 'playing' || history.length === 0) return;
    const previousState = history[history.length - 1];
    setBoard(previousState.board);
    setNotes(previousState.notes);
    setHistory(prev => prev.slice(0, prev.length - 1));
  };

  // Reveal hint
  const handleHint = () => {
    if (status !== 'playing' || !selectedCell) {
      toast.warning('Hãy chọn một ô để nhận gợi ý!');
      return;
    }
    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) return; // Locked
    if (board[row][col] === solution[row][col]) return; // Already correct

    if (hintsLeft <= 0) {
      toast.warning('Bạn đã dùng hết lượt gợi ý!');
      return;
    }

    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(r => r.map(c => [...c]))
    }]);

    const correctVal = solution[row][col];

    // Set board
    const updatedBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? correctVal : val))
    );
    setBoard(updatedBoard);

    // Clear notes
    const updatedNotes = notes.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? Array(9).fill(false) : c))
    );
    setNotes(updatedNotes);
    setHintsLeft(prev => prev - 1);
    toast.success('Đã điền đáp án đúng vào ô chọn!');

    checkWin(updatedBoard);
  };

  // Check if board is complete and correct
  const checkWin = async (currentBoard) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] !== solution[r][c]) {
          return; // Not won yet
        }
      }
    }

    // WIN STATE!
    setStatus('won');
    const earnedPoints = calculateRankPoints(difficulty, timer);
    toast.success(`🎉 Chúc mừng! Bạn đã thắng cuộc ở chế độ ${difficulty.toUpperCase()}!`);

    // Reward Rank Points
    try {
      const previousSudokuScore = minigameHighscores.sudoku || 0;
      const nextSudokuScore = Math.max(previousSudokuScore, earnedPoints);

      // Update highscores in Redux
      dispatch(setHighscores({ sudoku: nextSudokuScore }));

      // Sync with Cloud API
      const syncResponse = await handleSyncGameResultApi({
        minigame: 'sudoku',
        difficulty: difficulty,
        result: 'win',
        timeSpent: timer,
        rankPointsEarned: earnedPoints
      });

      if (syncResponse && syncResponse.errCode === 0) {
        toast.success(`Đã đồng bộ kết quả thành công! Nhận +🏆 ${earnedPoints.toLocaleString()} Điểm Rank`);
      } else {
        toast.info(`Nhận +🏆 ${earnedPoints.toLocaleString()} Điểm Rank (Cục bộ)`);
      }
    } catch (e) {
      console.log('Error updating reward:', e);
    }
  };

  // ═══ Keyboard Controls ═══
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (status !== 'playing' || !selectedCell) return;
      const { row, col } = selectedCell;

      if (e.key >= '1' && e.key <= '9') {
        inputNumber(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        eraseCell();
      } else if (e.key === 'ArrowUp' && row > 0) {
        setSelectedCell({ row: row - 1, col });
      } else if (e.key === 'ArrowDown' && row < 8) {
        setSelectedCell({ row: row + 1, col });
      } else if (e.key === 'ArrowLeft' && col > 0) {
        setSelectedCell({ row, col: col - 1 });
      } else if (e.key === 'ArrowRight' && col < 8) {
        setSelectedCell({ row, col: col + 1 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, status, inputNumber]);

  // Peer cell highlighting logic
  const isCellHighlighted = (rIdx, cIdx) => {
    if (!selectedCell) return false;
    const { row, col } = selectedCell;

    // Same row or col
    if (rIdx === row || cIdx === col) return true;

    // Same 3x3 block
    const blockRow = Math.floor(row / 3);
    const blockCol = Math.floor(col / 3);
    const cellBlockRow = Math.floor(rIdx / 3);
    const cellBlockCol = Math.floor(cIdx / 3);
    if (blockRow === cellBlockRow && blockCol === cellBlockCol) return true;

    return false;
  };

  const isValueMatch = (rIdx, cIdx) => {
    if (!selectedCell) return false;
    const { row, col } = selectedCell;
    const selectedVal = board[row][col];
    if (selectedVal === 0) return false;
    return board[rIdx][cIdx] === selectedVal;
  };

  return (
    <div className="sudoku-container animate-fade-in">
      {/* Header bar */}
      <div className="sudoku-header">
        <button className="btn-back" onClick={onClose}>
          <IonIcon icon={arrowBackOutline} /> Thoát
        </button>
        <span className="game-title">🔢 Sudoku Cosmic</span>
        <div className="header-actions">
          {status === 'playing' && (
            <button className="btn-action" onClick={() => setStatus('paused')}>
              <IonIcon icon={pauseOutline} /> Tạm dừng
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="sudoku-content">

        {/* Game Stats Panel */}
        <div className="sudoku-stats">
          <div className="stat-card">
            <span className="label">Độ khó</span>
            <span className="value text-gradient">{difficulty.toUpperCase()}</span>
          </div>
          <div className="stat-card">
            <span className="label"><IonIcon icon={timeOutline} /> Thời gian</span>
            <span className="value timer">{formatTime(timer)}</span>
          </div>
          <div className="stat-card">
            <span className="label"><IonIcon icon={alertCircleOutline} /> Số lỗi</span>
            <span className={`value mistakes ${mistakes > 0 ? 'alert' : ''}`}>
              {mistakes}
            </span>
          </div>
          <div className="stat-card">
            <span className="label"><IonIcon icon={trophyOutline} /> Điểm Rank</span>
            <span className="value coins">🏆 {calculateRankPoints(difficulty, timer).toLocaleString()}</span>
          </div>
        </div>

        {/* Board & Control Panel */}
        <div className="board-and-controls">

          {/* Sudoku 9x9 Grid */}
          <div className="sudoku-board-wrapper">
            <div className={`sudoku-board ${status !== 'playing' ? 'blur' : ''}`}>
              {board.map((r, rIdx) =>
                r.map((val, cIdx) => {
                  const isLocked = initialBoard[rIdx][cIdx] !== 0;
                  const isSelected = selectedCell && selectedCell.row === rIdx && selectedCell.col === cIdx;
                  const isPeer = isCellHighlighted(rIdx, cIdx);
                  const isMatch = isValueMatch(rIdx, cIdx);
                  const isWrong = val !== 0 && val !== solution[rIdx][cIdx];

                  let cellClass = 'sudoku-cell';
                  if (isLocked) cellClass += ' cell-locked';
                  if (isSelected) cellClass += ' cell-selected';
                  else if (isMatch) cellClass += ' cell-match';
                  else if (isPeer) cellClass += ' cell-peer';
                  if (isWrong) cellClass += ' cell-wrong';

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={cellClass}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                    >
                      {val !== 0 ? (
                        <span className="cell-value">{val}</span>
                      ) : (
                        // Render 3x3 tiny notes grid inside empty cell
                        <div className="notes-grid">
                          {notes[rIdx][cIdx].map((hasNote, noteIdx) => (
                            <span
                              key={noteIdx}
                              className={`note-digit ${hasNote ? 'visible' : ''}`}
                            >
                              {noteIdx + 1}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Overlays (Pause / Win / Lose) */}
            {status === 'paused' && !isSelectingDifficulty && (
              <div className="board-overlay glass">
                <h3>Game Tạm Dừng</h3>
                <p>Nhấp nút bên dưới để tiếp tục so tài!</p>
                <button className="btn-glow green" onClick={() => setStatus('playing')}>
                  <IonIcon icon={playOutline} /> Tiếp tục
                </button>
              </div>
            )}

            {status === 'won' && (
              <div className="board-overlay glass won-overlay animate-bounce-in">
                <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                <h3 className="text-gradient">Chiến Thắng!</h3>
                <p>Bạn đã hoàn thành câu đố ở cấp độ {difficulty.toUpperCase()} trong {formatTime(timer)} với {mistakes} lỗi!</p>
                <p className="earned-pcoin">🏆 +{calculateRankPoints(difficulty, timer).toLocaleString()} Điểm Rank</p>
                <div className="overlay-actions">
                  <button className="btn-glow green" onClick={onClose}>
                    Quay lại Hub
                  </button>
                </div>
              </div>
            )}

            {isSelectingDifficulty && (
              <div className="board-overlay glass diff-overlay">
                <h3 className="text-gradient">Chọn độ khó Sudoku</h3>
                <div className="difficulty-grid">
                  <button className="btn-diff easy" onClick={() => handleDifficultySelect('easy')}>
                    DỄ (Easy)
                    <span>💡 41 Clues | 🏆 Tối đa 5,000 Rank</span>
                  </button>
                  <button className="btn-diff medium" onClick={() => handleDifficultySelect('medium')}>
                    TRUNG BÌNH (Medium)
                    <span>⚡ 33 Clues | 🏆 Tối đa 10,000 Rank</span>
                  </button>
                  <button className="btn-diff hard" onClick={() => handleDifficultySelect('hard')}>
                    KHÓ (Hard)
                    <span>🧠 27 Clues | 🏆 Tối đa 20,000 Rank</span>
                  </button>
                  <button className="btn-diff expert" onClick={() => handleDifficultySelect('expert')}>
                    CHUYÊN GIA (Expert)
                    <span>🔥 23 Clues | 🏆 Tối đa 40,000 Rank</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Pad & Number Pad */}
          <div className="controls-pad">
            <div className="action-buttons">
              <button
                className="btn-ctrl"
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Quay lại bước trước"
              >
                <IonIcon icon={arrowBackOutline} />
                <span>Undo</span>
              </button>
              <button
                className="btn-ctrl"
                onClick={eraseCell}
                title="Xóa số tự điền"
              >
                <IonIcon icon={trashOutline} />
                <span>Xóa</span>
              </button>
              <button
                className={`btn-ctrl ${isNoteMode ? 'active' : ''}`}
                onClick={() => setIsNoteMode(!isNoteMode)}
                title="Bật/Tắt viết nháp số nhỏ"
              >
                <IonIcon icon={pencilOutline} />
                <span>Nháp ({isNoteMode ? 'BẬT' : 'TẮT'})</span>
              </button>
              <button
                className="btn-ctrl"
                onClick={handleHint}
                title={`Nhận gợi ý ô chọn (Còn ${hintsLeft} lượt)`}
              >
                <IonIcon icon={helpCircleOutline} />
                <span>Gợi ý ({hintsLeft})</span>
              </button>
            </div>

            {/* Number Pad */}
            <div className="number-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                // Check if this number is already fully completed on the board (9 times)
                let numCount = 0;
                board.forEach(row => row.forEach(val => {
                  if (val === num) numCount++;
                }));
                const isCompleted = numCount >= 9;

                return (
                  <button
                    key={num}
                    className={`num-btn ${isCompleted ? 'completed' : ''}`}
                    onClick={() => inputNumber(num)}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div className="keyboard-tip">
              💡 Mẹo: Bạn có thể dùng các phím mũi tên di chuyển, phím số 1-9 để điền, và Backspace để xóa ô trên bàn phím.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SudokuGame;
