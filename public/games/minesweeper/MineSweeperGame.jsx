import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  arrowBackOutline, trophyOutline, timeOutline,
  flagOutline, bugOutline, refreshOutline, alertCircleOutline
} from 'ionicons/icons';
import { toast } from 'react-toastify';
import { setHighscores } from '../../../src/store/actions';
import { handleSyncGameResultApi } from '../../../src/services/economyServices';
import './MineSweeperGame.scss';

// ═══ Minesweeper Board Configurations ═══
const DIFFICULTIES = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

const MAX_P = {
  easy: 3000,
  medium: 8000,
  hard: 18000
};

const MIN_P = {
  easy: 300,
  medium: 800,
  hard: 1800
};

const calculateRankPoints = (difficulty, time) => {
  if (difficulty === 'easy') {
    if (time <= 60) return MAX_P.easy;
    const extraSeconds = time - 60;
    return Math.max(MIN_P.easy, MAX_P.easy - extraSeconds * 10);
  } else if (difficulty === 'medium') {
    if (time <= 180) return MAX_P.medium;
    const extraSeconds = time - 180;
    return Math.max(MIN_P.medium, MAX_P.medium - extraSeconds * 20);
  } else if (difficulty === 'hard') {
    if (time <= 360) return MAX_P.hard;
    const extraSeconds = time - 360;
    return Math.max(MIN_P.hard, MAX_P.hard - extraSeconds * 30);
  }
  return MIN_P.easy;
};

const MineSweeperGame = ({ onClose }) => {
  const dispatch = useDispatch();
  const minigameHighscores = useSelector(state => state.minigameHighscores || {});

  // Game config & states
  const [difficulty, setDifficulty] = useState('easy');
  const [isSelectingDifficulty, setIsSelectingDifficulty] = useState(true);

  const [board, setBoard] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle', 'playing', 'won', 'lost'
  const [timer, setTimer] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [faceEmoji, setFaceEmoji] = useState('😊');
  const [isMobileFlagMode, setIsMobileFlagMode] = useState(false);
  const [isMouseDepressed, setIsMouseDepressed] = useState(false);

  const firstClickRef = useRef(true);
  const boardConfig = DIFFICULTIES[difficulty];

  // Timer Effect
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Sync Timer with status change
  useEffect(() => {
    if (status === 'won') {
      setFaceEmoji('😎');
    } else if (status === 'lost') {
      setFaceEmoji('💀');
    } else {
      setFaceEmoji('😊');
    }
  }, [status]);

  // Helper to iterate neighbors
  const getNeighbors = (r, c, maxRows, maxCols) => {
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < maxRows && nc >= 0 && nc < maxCols) {
          neighbors.push({ r: nr, c: nc });
        }
      }
    }
    return neighbors;
  };

  // Generate initial empty board
  const initBoard = (selectedDiff) => {
    const config = DIFFICULTIES[selectedDiff];
    const newBoard = [];
    for (let r = 0; r < config.rows; r++) {
      const rowArr = [];
      for (let c = 0; c < config.cols; c++) {
        rowArr.push({
          row: r,
          col: c,
          mine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0,
        });
      }
      newBoard.push(rowArr);
    }
    setBoard(newBoard);
    setStatus('idle');
    setTimer(0);
    setFlagCount(0);
    firstClickRef.current = true;
    setIsSelectingDifficulty(false);
    setIsMobileFlagMode(false);
  };

  // Safe first click placement of mines
  const placeMines = (startRow, startCol, currentBoard) => {
    const config = DIFFICULTIES[difficulty];
    const safeZone = new Set();
    // 3x3 surrounding cells must be safe
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = startRow + dr;
        const nc = startCol + dc;
        if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
          safeZone.add(`${nr},${nc}`);
        }
      }
    }

    let minesPlaced = 0;
    while (minesPlaced < config.mines) {
      const r = Math.floor(Math.random() * config.rows);
      const c = Math.floor(Math.random() * config.cols);
      if (!currentBoard[r][c].mine && !safeZone.has(`${r},${c}`)) {
        currentBoard[r][c].mine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor values
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (currentBoard[r][c].mine) continue;
        const neighbors = getNeighbors(r, c, config.rows, config.cols);
        let mineCount = 0;
        neighbors.forEach(n => {
          if (currentBoard[n.r][n.c].mine) mineCount++;
        });
        currentBoard[r][c].adjacentMines = mineCount;
      }
    }
  };

  // Flood fill reveal
  const revealCell = (r, c, currentBoard) => {
    const cell = currentBoard[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;

    if (cell.adjacentMines === 0 && !cell.mine) {
      const config = DIFFICULTIES[difficulty];
      const neighbors = getNeighbors(r, c, config.rows, config.cols);
      neighbors.forEach(n => {
        revealCell(n.r, n.c, currentBoard);
      });
    }
  };

  // Check Win condition
  const checkWinCondition = (currentBoard) => {
    const config = DIFFICULTIES[difficulty];
    let revealedCount = 0;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (currentBoard[r][c].revealed) revealedCount++;
      }
    }
    const safeCells = (config.rows * config.cols) - config.mines;
    return revealedCount === safeCells;
  };

  // Perform win routine
  const handleWin = async (finalBoard) => {
    setStatus('won');
    // Auto-flag all mines
    const config = DIFFICULTIES[difficulty];
    const wonBoard = finalBoard.map(row =>
      row.map(cell => {
        if (cell.mine) {
          return { ...cell, flagged: true };
        }
        return cell;
      })
    );
    setBoard(wonBoard);
    setFlagCount(config.mines);

    const earnedPoints = calculateRankPoints(difficulty, timer);
    toast.success(`🎉 Tuyệt vời! Bạn đã gỡ mìn thành công cấp độ ${difficulty.toUpperCase()}!`);

    try {
      const previousScore = minigameHighscores.minesweeper || 0;
      const nextScore = Math.max(previousScore, earnedPoints);

      // Redux
      dispatch(setHighscores({ minesweeper: nextScore }));

      // API
      const syncResponse = await handleSyncGameResultApi({
        minigame: 'minesweeper',
        difficulty: difficulty,
        result: 'win',
        timeSpent: timer,
        rankPointsEarned: earnedPoints
      });

      if (syncResponse && syncResponse.errCode === 0) {
        toast.success(`Đồng bộ kết quả thành công! +🏆 ${earnedPoints.toLocaleString()} Điểm Rank`);
      } else {
        toast.info(`+🏆 ${earnedPoints.toLocaleString()} Điểm Rank (Offline)`);
      }
    } catch (e) {
      console.log('Error syncing score:', e);
    }
  };

  // Perform game over routine
  const handleGameOver = (clickedRow, clickedCol, currentBoard) => {
    setStatus('lost');
    const config = DIFFICULTIES[difficulty];

    const finalBoard = currentBoard.map((rowArr, r) =>
      rowArr.map((cell, c) => {
        // Exploded mine
        if (r === clickedRow && c === clickedCol) {
          return { ...cell, revealed: true, exploded: true };
        }
        // Unflagged mines revealed
        if (cell.mine && !cell.flagged) {
          return { ...cell, revealed: true };
        }
        // Incorrectly flagged cells
        if (!cell.mine && cell.flagged) {
          return { ...cell, wrongFlag: true };
        }
        return cell;
      })
    );
    setBoard(finalBoard);
    toast.error('💥 Bùm! Bạn đã kích hoạt một quả mìn.');
  };

  // Left click cell click handler
  const handleCellClick = (row, col) => {
    if (status === 'won' || status === 'lost') return;

    if (isMobileFlagMode) {
      handleCellFlag(row, col);
      return;
    }

    const currentBoard = board.map(rowArr => rowArr.map(c => ({ ...c })));
    const cell = currentBoard[row][col];
    if (cell.revealed || cell.flagged) return;

    if (firstClickRef.current) {
      firstClickRef.current = false;
      placeMines(row, col, currentBoard);
      setStatus('playing');
    }

    if (currentBoard[row][col].mine) {
      handleGameOver(row, col, currentBoard);
      return;
    }

    revealCell(row, col, currentBoard);

    if (checkWinCondition(currentBoard)) {
      handleWin(currentBoard);
    } else {
      setBoard(currentBoard);
    }
  };

  // Right click flag cell handler
  const handleCellFlag = (row, col, e) => {
    if (e) e.preventDefault();
    if (status === 'won' || status === 'lost') return;

    // Start timer on first interaction if flagging
    if (firstClickRef.current && status === 'idle') {
      firstClickRef.current = false;
      setStatus('playing');
      const currentBoard = board.map(rowArr => rowArr.map(c => ({ ...c })));
      placeMines(row, col, currentBoard);
      currentBoard[row][col].flagged = true;
      setBoard(currentBoard);
      setFlagCount(1);
      return;
    }

    const currentBoard = board.map(rowArr => rowArr.map(c => ({ ...c })));
    const cell = currentBoard[row][col];
    if (cell.revealed) return;

    const newFlagged = !cell.flagged;
    cell.flagged = newFlagged;
    setBoard(currentBoard);
    setFlagCount(prev => prev + (newFlagged ? 1 : -1));
  };

  // Chord click (clicking revealed numbers to auto-clear surrounding if flag count matches)
  const handleChordClick = (row, col) => {
    if (status !== 'playing') return;
    const cell = board[row][col];
    if (!cell.revealed || cell.adjacentMines === 0) return;

    const config = DIFFICULTIES[difficulty];
    const neighbors = getNeighbors(row, col, config.rows, config.cols);

    // Count flags around
    let flagsCount = 0;
    neighbors.forEach(n => {
      if (board[n.r][n.c].flagged) flagsCount++;
    });

    if (flagsCount === cell.adjacentMines) {
      const currentBoard = board.map(rowArr => rowArr.map(c => ({ ...c })));
      let hitMine = false;
      let mineRow = -1;
      let mineCol = -1;

      neighbors.forEach(n => {
        const nc = currentBoard[n.r][n.c];
        if (!nc.revealed && !nc.flagged) {
          if (nc.mine) {
            hitMine = true;
            mineRow = n.r;
            mineCol = n.c;
          } else {
            revealCell(n.r, n.c, currentBoard);
          }
        }
      });

      if (hitMine) {
        handleGameOver(mineRow, mineCol, currentBoard);
      } else if (checkWinCondition(currentBoard)) {
        handleWin(currentBoard);
      } else {
        setBoard(currentBoard);
      }
    }
  };

  // Reset current board
  const handleReset = () => {
    initBoard(difficulty);
  };

  // Format Time
  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mouse event handlers for Face emoji reactions
  const handleMouseDown = () => {
    if (status === 'playing') {
      setIsMouseDepressed(true);
      setFaceEmoji('😮');
    }
  };

  const handleMouseUp = () => {
    if (status === 'playing') {
      setIsMouseDepressed(false);
      setFaceEmoji('😊');
    }
  };

  return (
    <div className="minesweeper-container animate-fade-in">
      {/* Header bar */}
      <div className="minesweeper-header">
        <button className="btn-back" onClick={onClose}>
          <IonIcon icon={arrowBackOutline} /> Thoát
        </button>
        <span className="game-title">💣 Minesweeper Stellar</span>
        <div className="header-actions"></div>
      </div>

      {/* Main Content Area */}
      <div className="minesweeper-content">
        {isSelectingDifficulty ? (
          <div className="difficulty-screen animate-fade-in">
            <div className="difficulty-screen-inner">
              <h2 className="text-gradient">Chọn độ khó gỡ mìn</h2>
              <p className="difficulty-subtitle">Càng nhiều mìn thử thách càng cao, nhận nhiều điểm rank!</p>
              <div className="difficulty-grid">
                <button className="btn-diff easy" onClick={() => { setDifficulty('easy'); initBoard('easy'); }}>
                  <div className="diff-icon">🟢</div>
                  <div className="diff-info">
                    <span className="diff-name">DỄ (Easy)</span>
                    <span className="diff-desc">9x9 Grid | 10 Mines | 🏆 Lên tới 3,000 Rank</span>
                  </div>
                </button>
                <button className="btn-diff medium" onClick={() => { setDifficulty('medium'); initBoard('medium'); }}>
                  <div className="diff-icon">🔵</div>
                  <div className="diff-info">
                    <span className="diff-name">TRUNG BÌNH (Medium)</span>
                    <span className="diff-desc">16x16 Grid | 40 Mines | 🏆 Lên tới 8,000 Rank</span>
                  </div>
                </button>
                <button className="btn-diff hard" onClick={() => { setDifficulty('hard'); initBoard('hard'); }}>
                  <div className="diff-icon">🔴</div>
                  <div className="diff-info">
                    <span className="diff-name">KHÓ (Hard)</span>
                    <span className="diff-desc">30x16 Grid | 99 Mines | 🏆 Lên tới 18,000 Rank</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Game Stats Panel */}
            <div className="minesweeper-stats">
              <div className="stat-card">
                <span className="label">Độ khó</span>
                <span className="value text-gradient">{difficulty.toUpperCase()}</span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={timeOutline} /> Thời gian</span>
                <span className="value timer">{formatTime(timer)}</span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={flagOutline} /> Còn lại</span>
                <span className="value mines">
                  {Math.max(0, boardConfig.mines - flagCount)}
                </span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={trophyOutline} /> Điểm Rank</span>
                <span className="value coins">🏆 {calculateRankPoints(difficulty, timer).toLocaleString()}</span>
              </div>
            </div>

            {/* Board Controls */}
            <div className="board-actions">
              <button
                className={`action-mode-btn ${isMobileFlagMode ? 'active' : ''}`}
                onClick={() => setIsMobileFlagMode(!isMobileFlagMode)}
                title="Bật chế độ cắm cờ nhanh trên điện thoại"
              >
                <IonIcon icon={flagOutline} />
                <span>{isMobileFlagMode ? 'Chế độ: Cắm cờ' : 'Chế độ: Mở ô'}</span>
              </button>

              <button className="face-btn" onClick={handleReset} title="Chơi lại">
                {faceEmoji}
              </button>

              <button className="action-mode-btn" onClick={() => setIsSelectingDifficulty(true)}>
                <IonIcon icon={refreshOutline} />
                <span>Đổi độ khó</span>
              </button>
            </div>

            {/* Board Game Grid */}
            <div className="board-and-controls">
              <div className="minesweeper-board-wrapper">
                <div
                  className={`minesweeper-board ${status === 'lost' || status === 'won' ? 'blur' : ''}`}
                  style={{
                    gridTemplateColumns: `repeat(${boardConfig.cols}, 32px)`,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {board.map((rowArr, r) =>
                    rowArr.map((cell, c) => {
                      let cellClass = 'minesweeper-cell';
                      let content = '';

                      if (!cell.revealed) {
                        cellClass += ' cell-hidden';
                        if (cell.flagged) {
                          cellClass += ' cell-flagged';
                          content = '🚩';
                        }
                      } else {
                        cellClass += ' cell-revealed reveal-anim';
                        if (cell.mine) {
                          if (cell.exploded) {
                            cellClass += ' cell-mine-exploded';
                            content = '💥';
                          } else {
                            cellClass += ' cell-mine-revealed';
                            content = '💣';
                          }
                        } else if (cell.adjacentMines > 0) {
                          cellClass += ` n${cell.adjacentMines}`;
                          content = cell.adjacentMines;
                        }
                      }

                      if (cell.wrongFlag) {
                        cellClass += ' cell-wrong-flag';
                        content = '❌';
                      }

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={cellClass}
                          onClick={() => handleCellClick(r, c)}
                          onContextMenu={(e) => handleCellFlag(r, c, e)}
                          onDoubleClick={() => handleChordClick(r, c)}
                        >
                          {content}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Game End Overlay */}
                {status === 'won' && (
                  <div className="board-overlay glass won-overlay animate-bounce-in">
                    <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                    <h3 className="text-gradient">Thắng Cuộc!</h3>
                    <p>Bạn đã gỡ sạch mìn ở độ khó {difficulty.toUpperCase()} trong {formatTime(timer)}!</p>
                    <p className="earned-pcoin">🏆 +{calculateRankPoints(difficulty, timer).toLocaleString()} Điểm Rank</p>
                    <div className="overlay-actions">
                      <button className="btn-glow green" onClick={onClose}>
                        Quay lại Hub
                      </button>
                    </div>
                  </div>
                )}

                {status === 'lost' && (
                  <div className="board-overlay glass won-overlay animate-bounce-in">
                    <IonIcon icon={alertCircleOutline} style={{ fontSize: 60, color: '#ef4444' }} />
                    <h3 className="text-gradient" style={{ background: 'linear-gradient(135deg, #ef4444, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Bị Nổ!
                    </h3>
                    <p>Rất tiếc, bạn đã dẫm phải mìn sau {formatTime(timer)}.</p>
                    <div className="overlay-actions">
                      <button className="btn-glow red" onClick={handleReset}>
                        Thử Lại
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bottom-tip">
              💡 Mẹo: Nhấp chuột phải (Right click) để cắm cờ. Nhấp đúp (Double-click) vào ô chứa số đã đủ cờ xung quanh để mở nhanh các ô lân cận!
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MineSweeperGame;
