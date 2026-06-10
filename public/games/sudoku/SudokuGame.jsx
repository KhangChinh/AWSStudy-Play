import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  closeOutline, refreshOutline,
  pencilOutline, trashOutline, helpCircleOutline, arrowBackOutline,
  trophyOutline, heartOutline, timeOutline, alertCircleOutline
} from 'ionicons/icons';
import { toast } from 'react-toastify';
import { setEconomy, setHighscores, userLogin } from '../../../src/store/actions';
import { handleSyncGameResultApi } from '../../../src/services/economyServices';
import './SudokuGame.scss';

// ═══ Sudoku Campaign Helpers & Mock DB ═══

const parseGridString = (gridString) => {
  const grid = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(parseInt(gridString[r * 9 + c], 10));
    }
    grid.push(row);
  }
  return grid;
};

const getLevelIdFromSK = (sk) => {
  const match = sk.match(/sudoku#level_(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

const getDifficultyLabel = (levelId) => {
  if (levelId <= 5) return 'Dễ';
  if (levelId <= 10) return 'Trung bình';
  if (levelId <= 15) return 'Khó';
  return 'Chuyên gia';
};

const getDifficultyEnglish = (levelId) => {
  if (levelId <= 5) return 'easy';
  if (levelId <= 10) return 'medium';
  if (levelId <= 15) return 'hard';
  return 'expert';
};

// Generates mathematical variation of baseline grid depending on levelId
const mapGridString = (str, levelId) => {
  if (levelId === 1) return str;
  return str.split('').map(char => {
    if (char === '0') return '0';
    const num = parseInt(char, 10);
    // Shift digit between 1 and 9
    const mapped = ((num - 1 + (levelId - 1)) % 9) + 1;
    return mapped.toString();
  }).join('');
};

const baselineInitial = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const baselineSolution = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const MOCK_LEVELS = Array.from({ length: 20 }, (_, index) => {
  const levelId = index + 1;
  let unlockCostSanity = 0;
  let maxScoreCap = 1000;

  if (levelId >= 6 && levelId <= 10) {
    unlockCostSanity = 100;
    maxScoreCap = 1500;
  } else if (levelId >= 11 && levelId <= 15) {
    unlockCostSanity = 200;
    maxScoreCap = 2000;
  } else if (levelId >= 16 && levelId <= 20) {
    unlockCostSanity = 300;
    maxScoreCap = 2500;
  }

  return {
    PK: "minigame",
    SK: `sudoku#level_${levelId}`,
    name: `Sudoku Màn ${levelId}`,
    unlockCostSanity,
    maxScoreCap,
    baseMapConfig: {
      gridSize: "9x9",
      emptyCellsCount: 43,
      initialGrid: mapGridString(baselineInitial, levelId),
      solutionGrid: mapGridString(baselineSolution, levelId)
    }
  };
});
// Rank points calculation based on levelId and maxScoreCap
const calculateRankPoints = (levelId, maxScoreCap, timeSpent) => {
  let threshold = 600;
  if (levelId >= 1 && levelId <= 5) threshold = 600;
  else if (levelId >= 6 && levelId <= 10) threshold = 900;
  else if (levelId >= 11 && levelId <= 15) threshold = 1200;
  else if (levelId >= 16 && levelId <= 20) threshold = 1500;

  if (timeSpent <= threshold) {
    return maxScoreCap;
  }

  // Deduct points for exceeding threshold: 1.5 points per second
  const secondsOver = timeSpent - threshold;
  const penalty = secondsOver * 1.5;
  const score = maxScoreCap - penalty;
  const minScore = Math.floor(maxScoreCap * 0.1);
  return Math.max(minScore, Math.floor(score));
};

const SudokuGame = ({ onClose }) => {
  const dispatch = useDispatch();
  const economy = useSelector(state => state.economy || { pCoins: 0 });
  const minigameHighscores = useSelector(state => state.minigameHighscores || {});
  const userInfo = useSelector(state => state.userInfo || {});
  const budget = userInfo.budget || {
    knowledgePoint: 1500,
    knowledgeCore: 10,
    sanity: 5000,
    entainCoin: 300
  };
  const currentSanity = budget.sanity;

  // Game configuration & status
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [unlockedLevels, setUnlockedLevels] = useState([1, 2, 3, 4, 5]);
  const [isSelectingLevel, setIsSelectingLevel] = useState(true);

  const [board, setBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [notes, setNotes] = useState(Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(9).fill(false))));

  const [selectedCell, setSelectedCell] = useState(null); // { row, col }
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle', 'playing', 'won', 'lost'
  const [timer, setTimer] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [isNoteMode, setIsNoteMode] = useState(false);

  // ═══ Timer Effect ═══
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // ═══ Initialize Game ═══
  const initFixedLevel = (level) => {
    const parsedInitial = parseGridString(level.baseMapConfig.initialGrid);
    const parsedSolution = parseGridString(level.baseMapConfig.solutionGrid);
    setBoard(parsedInitial.map(row => [...row]));
    setInitialBoard(parsedInitial.map(row => [...row]));
    setSolution(parsedSolution);
    setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(9).fill(false))));
    setMistakes(0);
    setTimer(0);
    setHintsLeft(3);
    setSelectedCell(null);
    setSelectedLevel(level);
    setIsSelectingLevel(false);
    setStatus('playing');
    toast.info(`Màn ${getLevelIdFromSK(level.SK)} bắt đầu!`);
  };

  const handleLevelSelect = (level) => {
    const levelId = getLevelIdFromSK(level.SK);
    const isUnlocked = unlockedLevels.includes(levelId);

    if (isUnlocked) {
      initFixedLevel(level);
    } else {
      const cost = level.unlockCostSanity;
      if (currentSanity >= cost) {
        // Deduct sanity
        const nextSanity = currentSanity - cost;
        const nextBudget = { ...budget, sanity: nextSanity };
        const nextUserInfo = { ...userInfo, budget: nextBudget };
        dispatch(userLogin(nextUserInfo));

        // Add to unlocked levels
        setUnlockedLevels(prev => [...prev, levelId]);
        toast.success(`Mở khóa thành công Màn ${levelId}! Bắt đầu chơi.`);
        // Start game
        initFixedLevel(level);
      } else {
        toast.error(`Không đủ Sanity! Bạn cần ${cost} Sanity để mở khóa Màn ${levelId}.`);
      }
    }
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



    const updatedBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? 0 : val))
    );
    setBoard(updatedBoard);

    const updatedNotes = notes.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? Array(9).fill(false) : c))
    );
    setNotes(updatedNotes);
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
    const levelId = selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1;
    const maxScoreCap = selectedLevel ? selectedLevel.maxScoreCap : 1000;
    const diffLabel = getDifficultyLabel(levelId);
    const diffEng = getDifficultyEnglish(levelId);

    setStatus('won');
    const earnedPoints = calculateRankPoints(levelId, maxScoreCap, timer);
    toast.success(`🎉 Chúc mừng! Bạn đã thắng cuộc ở Màn ${levelId} (${diffLabel})!`);

    // Reward Rank Points
    try {
      const previousSudokuScore = minigameHighscores.sudoku || 0;
      const nextSudokuScore = Math.max(previousSudokuScore, earnedPoints);

      // Update highscores in Redux
      dispatch(setHighscores({ sudoku: nextSudokuScore }));

      // Sync with Cloud API
      const syncResponse = await handleSyncGameResultApi({
        minigame: 'sudoku',
        difficulty: diffEng,
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
        <div className="header-actions"></div>
      </div>

      {/* Main Content Area */}
      <div className="sudoku-content">

        {/* ═══ Campaign Level Selection Screen ═══ */}
        {isSelectingLevel ? (
          <div className="level-selection-screen animate-fade-in">
            <div className="level-selection-inner">
              <h2 className="text-gradient">Vượt ải Sudoku Cosmic</h2>
              <p className="level-subtitle">Mở khóa và vượt qua 20 màn chơi để tích lũy điểm Rank!</p>

              {/* User Coins Display */}
              <div className="user-coins-bar">
                <span>💰 Số dư: <strong>{(budget.sanity || 0).toLocaleString()}</strong> Sanity</span>
              </div>

              <div className="level-grid">
                {MOCK_LEVELS.map(level => {
                  const levelId = getLevelIdFromSK(level.SK);
                  const isUnlocked = unlockedLevels.includes(levelId);
                  const difficultyLabel = getDifficultyLabel(levelId);

                  // Color range classes: 1-5 easy, 6-10 medium, 11-15 hard, 16-20 expert
                  let colorClass = 'easy';
                  if (levelId >= 6 && levelId <= 10) colorClass = 'medium';
                  else if (levelId >= 11 && levelId <= 15) colorClass = 'hard';
                  else if (levelId >= 16 && levelId <= 20) colorClass = 'expert';

                  return (
                    <button
                      key={level.SK}
                      className={`btn-level ${colorClass} ${isUnlocked ? 'unlocked' : 'locked'}`}
                      onClick={() => handleLevelSelect(level)}
                    >
                      <span className="level-num">{levelId}</span>
                      <span className="level-diff-badge">{difficultyLabel}</span>
                      {!isUnlocked && (
                        <span className="level-cost">
                          🔒 {level.unlockCostCoins}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Game Stats Panel */}
            <div className="sudoku-stats">
              <div className="stat-card">
                <span className="label">Độ khó</span>
                <span className="value text-gradient">MÀN {selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1} - {getDifficultyLabel(selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1).toUpperCase()}</span>
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
                <span className="value coins">🏆 {calculateRankPoints(selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1, selectedLevel ? selectedLevel.maxScoreCap : 1000, timer).toLocaleString()}</span>
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

                {/* Win Overlay */}
                {status === 'won' && (
                  <div className="board-overlay glass won-overlay animate-bounce-in">
                    <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                    <h3 className="text-gradient">Chiến Thắng!</h3>
                    <p>Bạn đã hoàn thành Màn {selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1} ({getDifficultyLabel(selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1)}) trong {formatTime(timer)} với {mistakes} lỗi!</p>
                    <p className="earned-pcoin">🏆 +{calculateRankPoints(selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1, selectedLevel ? selectedLevel.maxScoreCap : 1000, timer).toLocaleString()} Điểm Rank</p>
                    <div className="overlay-actions">
                      <button className="btn-glow green" onClick={onClose}>
                        Quay lại Hub
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
          </>
        )}
      </div>
    </div>
  );
};

export default SudokuGame;
