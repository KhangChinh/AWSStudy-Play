import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  closeOutline, refreshOutline,
  arrowBackOutline, trophyOutline,
  timeOutline, checkmarkDoneOutline,
  flashOutline, lockClosedOutline,
  bugOutline, flagOutline
} from 'ionicons/icons';

import { handleGetLeaderboardApi } from '../../../../services/minigameServices';
import { handleStartMinesweeperSession, handleSubmitMinesweeper, handleRevealApi } from '../../../../services/minesweeperService';
import { setProfile } from '../../../../store/actions/profileActions';
import UserAvatar from '../../../../components/UserAvatar';
import { toast } from 'react-toastify';
import currencyAssets from '../../../../data/currencyAssets';
import './MinesweeperGame.scss';
import {
  clearMinigameLogs,
  addMinigameLog,
  saveMinigameFinalResult
} from '../../../../store/actions/minigameLogActions';

// ═══ Minesweeper Helpers & Mock DB ═══

const getLevelIdFromSK = (sk) => {
  if (!sk || typeof sk !== 'string') return 1;
  const match = sk.match(/level_(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

const parseGridString = (gridInput, rows, cols) => {
  if (!gridInput) {
    return Array(rows).fill(null).map(() => Array(cols).fill(0));
  }

  // If already 2D array
  if (Array.isArray(gridInput) && Array.isArray(gridInput[0])) {
    return gridInput.map(row => row.map(val => (val === 1 || val === '1' || val === '*' || val === 'M' ? 1 : 0)));
  }

  // If 1D array
  if (Array.isArray(gridInput)) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const val = gridInput[r * cols + c];
        row.push(val === 1 || val === '1' || val === '*' || val === 'M' ? 1 : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  // If string
  if (typeof gridInput === 'string') {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const char = gridInput[r * cols + c];
        row.push(char === '1' || char === '*' || char === 'M' ? 1 : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  return Array(rows).fill(null).map(() => Array(cols).fill(0));
};

const getNeighborMinesCount = (grid, r, c, rows, cols) => {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (grid[nr][nc] === 1) {
          count++;
        }
      }
    }
  }
  return count;
};

const calculateRankPoints = (maxScoreCap, timeSpentSeconds, minesCount, revealedCount, totalSafeCells) => {
  if (!maxScoreCap) return 0;

  // Base score proportional to percentage of progress
  const progressRatio = totalSafeCells > 0 ? (revealedCount / totalSafeCells) : 1;
  const effectivePenaltyTime = Math.max(0, timeSpentSeconds - minesCount * 2);

  let score = maxScoreCap * progressRatio * (1 - Math.floor(effectivePenaltyTime / 10) * 0.01);

  const minScore = Math.floor(maxScoreCap * 0.1);
  if (score < minScore) {
    score = minScore;
  }

  return Math.floor(score);
};

const MinesweeperGame = ({ onClose }) => {
  const dispatch = useDispatch();

  // Log from Redux to be sent to server
  const reduxLogs = useSelector(state => state.minigameLogs?.actionLogs || []);

  const minigameHighscores = useSelector(state => state.minigameHighscores || {});
  const minesweeperLeaderboard = useSelector(state => state.minigame?.leaderboards?.minesweeper || {
    data: [],
    expiresAt: null
  });

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardTab, setLeaderboardTab] = useState('GLOBAL');
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const userInfo = useSelector(state => state.userInfo || {});
  const userProfile = useSelector(state => state.profile?.userProfile || {});
  const budget = userProfile.budget || {
    sanity: 0,
    eCoin: 0
  };

  // Game configuration & status
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [sanityCostPaid, setSanityCostPaid] = useState(0);
  const [isSelectingLevel, setIsSelectingLevel] = useState(true);
  // --- THÊM VÀO PHẦN KHAI BÁO STATE ---
  const [gameStateToken, setGameStateToken] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [minesCount, setMinesCount] = useState(10);
  const [grid, setGrid] = useState([]); // 2D array of cells
  const [flagsPlaced, setFlagsPlaced] = useState(0);

  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'won' | 'lost'
  const [timer, setTimer] = useState(0);
  const [earnedScore, setEarnedScore] = useState(0);
  const [earnedCoin, setEarnedCoin] = useState(0);

  const levels = useSelector(state => state.minigame?.minesweeperLevels || []);
  const levelHighscores = useMemo(() => {
    const result = {};
    levels.forEach(level => {
      const levelId = level.levelId || getLevelIdFromSK(level.SK);
      if (level.score) {
        result[levelId] = {
          score: level.score.personalBest || 0,
          achievedAt: level.score.achievedAt
            ? new Date(level.score.achievedAt * 1000).toLocaleDateString("vi-VN")
            : "Chưa vượt qua"
        };
      }
    });
    return result;
  }, [levels]);

  const totalAccumulatedScore = useMemo(() => {
    return levels.reduce((sum, level) => {
      return sum + (level.score?.personalBest || 0);
    }, 0);
  }, [levels]);

  const fetchLeaderboard = useCallback(async (tab = leaderboardTab, forceRefresh = false) => {
    try {
      setLoadingLeaderboard(true);
      const response = await handleGetLeaderboardApi('minesweeper');

      if (response?.success) {
        setLeaderboardData(response.topPlayers || []);
      } else {
        toast.error(response?.error || 'Không thể tải bảng xếp hạng!');
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
      toast.error('Lỗi kết nối khi tải bảng xếp hạng!');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [leaderboardTab]);

  useEffect(() => {
    if (showLeaderboardModal) {
      fetchLeaderboard(leaderboardTab);
    }
  }, [showLeaderboardModal, leaderboardTab, fetchLeaderboard]);

  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Recursively reveals adjacent empty cells
  const revealEmptyCells = (tempGrid, r, c, maxR, maxC) => {
    if (r < 0 || r >= maxR || c < 0 || c >= maxC) return;
    const cell = tempGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    if (cell.neighborMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          revealEmptyCells(tempGrid, r + dr, c + dc, maxR, maxC);
        }
      }
    }
  };

  // ═══ Initialize Game ═══
  // ═══ Initialize Game ═══
  const initFixedLevel = (level, costPaid, puzzleGridStr, token) => {
    // 1. Kiểm tra cấu hình bắt buộc từ Redux (Chặn lỗi ngay từ đầu)
    if (!level || !level.baseMapConfig || !level.baseMapConfig.gridSize) {
      toast.error("Lỗi: Dữ liệu màn chơi bị thiếu cấu hình bản đồ (baseMapConfig)!");
      return;
    }

    // Lấy kích thước và tổng số mìn trực tiếp từ config
    const [tempRows, tempCols] = level.baseMapConfig.gridSize.split('x').map(Number);
    const tempMines = level.baseMapConfig.mineCount || 0; // Để hiển thị UI số cờ cắm

    // Bắt lỗi nếu parse ra không phải là số hợp lệ
    if (!tempRows || !tempCols) {
      toast.error("Lỗi: Cấu hình gridSize không hợp lệ!");
      return;
    }

    setRows(tempRows);
    setCols(tempCols);
    setMinesCount(tempMines);

    // 2. Render lưới dựa trên số row/col lấy được
    const initialGrid = Array(tempRows).fill(null).map((_, r) => {
      return Array(tempCols).fill(null).map((_, c) => {

        let char;
        if (Array.isArray(puzzleGridStr) && Array.isArray(puzzleGridStr[0])) {
          char = puzzleGridStr[r][c];
        } else {
          char = puzzleGridStr[r * tempCols + c];
        }

        // Ký tự khác 'H' nghĩa là server cho phép mở ô này
        const isRevealed = char !== 'H';

        // Lấy con số an toàn (nếu có), không thì mặc định là 0
        const neighborCount = isRevealed && !isNaN(parseInt(char)) ? parseInt(char, 10) : 0;

        // Client không cần tính mìn ở đâu, chỉ ghi nhận nếu vô tình server gửi chữ '*'
        const isMine = char === '*';

        return {
          row: r,
          col: c,
          isMine: isMine,
          neighborMines: neighborCount,
          isRevealed: isRevealed,
          isFlagged: false
        };
      });
    });

    setGrid(initialGrid);
    setGameStateToken(token);
    setFlagsPlaced(0);

    dispatch(clearMinigameLogs());
    setTimer(0);
    setSelectedLevel(level);
    setSanityCostPaid(costPaid);
    setIsSelectingLevel(false);
    setStatus('playing');
  };
  const handleLevelSelect = async (level) => {
    const displayLevelId = getLevelIdFromSK(level.SK);
    const targetSK = level.SK;
    const cost = level.sanityCost;

    try {
      toast.info(`Đang tạo ván đấu ${displayLevelId}...`);
      const response = await handleStartMinesweeperSession('minesweeper', targetSK);

      if (response && (response.success || response.errCode === 0)) {
        const newBudget = response.profile?.budget;
        if (newBudget) {
          const nextUserInfo = { ...userInfo, budget: newBudget };
          dispatch(setProfile(nextUserInfo));
        }

        const puzzleGrid = response.sessionData?.puzzleGrid;
        const token = response.sessionData?.gameStateToken;
        if (!puzzleGrid) {
          toast.error("Lỗi: Máy chủ không trả về dữ liệu đề bài Minesweeper.");
          return;
        }

        initFixedLevel(level, cost, puzzleGrid, token);
      }
    } catch (e) {
      console.error('Error starting game session:', e);
    }
  };

  const handleExit = async () => {
    if (status === 'playing') {
      setConfirmDialog({
        isOpen: true,
        message: "Thoát giữa chừng sẽ bị tính là thua. Bạn có chắc chắn?",
        onConfirm: async () => {
          try {
            const levelId = selectedLevel ? (getLevelIdFromSK(selectedLevel.SK)) : "level_01";
            const finalGridStr = getFinalGridStr();
            const response = await handleSubmitMinesweeper(selectedLevel.SK, finalGridStr, reduxLogs, 'quit');


          } catch (e) {
            console.error('Error exiting game session:', e);
          }
          dispatch(clearMinigameLogs());
          setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
          onClose();
        }
      });
      return;
    }
    onClose();
  };

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFinalGridStr = (currentGrid = grid) => {
    return currentGrid.map(row => row.map(cell => {
      if (cell.isFlagged) return 'F';
      if (!cell.isRevealed) return '.';
      if (cell.isMine) return '*';
      return cell.neighborMines.toString();
    }).join('')).join('');
  };

  const countRevealedSafeCells = (currentGrid) => {
    let count = 0;
    currentGrid.forEach(row => row.forEach(cell => {
      if (cell.isRevealed && !cell.isMine) count++;
    }));
    return count;
  };

  const handleCellClick = async (r, c) => {
    if (status !== 'playing' || isRevealing) return;
    const cell = grid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    // Log Redux (Nếu cần)
    dispatch(addMinigameLog({ row: r, col: c, action: 'reveal', timestamp: Date.now() }));

    try {
      setIsRevealing(true);

      // GỌI LÊN SERVER ĐỂ MỞ Ô
      const res = await handleRevealApi(r, c, gameStateToken);

      if (!res.success) {
        toast.error(res.error || "Lỗi khi mở ô!");
        setIsRevealing(false);
        return;
      }

      const nextGrid = grid.map(row => row.map(cellItem => ({ ...cellItem })));

      if (res.result === 'lost') {
        // Xử lý Thua (Server trả về res.fullGrid là chuỗi đáp án hoàn chỉnh)
        const fullGridStr = res.fullGrid;
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const char = fullGridStr[i * cols + j];
            if (char === '*') {
              nextGrid[i][j].isMine = true;
              nextGrid[i][j].isRevealed = true;
            }
          }
        }
        setGrid(nextGrid);
        setStatus('lost');
        handleEndSession('lost', nextGrid);

      } else if (res.result === 'continue' || res.result === 'win') {
        // Cập nhật các ô an toàn mà server vừa loang ra
        res.newlyRevealed.forEach(item => {
          const targetCell = nextGrid[item.r][item.c];
          targetCell.isRevealed = true;
          targetCell.isMine = false;
          targetCell.neighborMines = parseInt(item.val, 10) || 0;
        });

        setGrid(nextGrid);

        // LƯU LẠI TOKEN MỚI SERVER CẤP PHÁT ĐỂ ĐI BƯỚC TIẾP THEO
        if (res.gameStateToken) {
          setGameStateToken(res.gameStateToken);
        }

        if (res.result === 'win') {
          setStatus('won');
          handleEndSession('win', nextGrid);
        }
      }
    } catch (e) {
      console.error('Error revealing cell:', e);
      toast.error('Mất kết nối máy chủ!');
    } finally {
      setIsRevealing(false);
    }
  };
  const handleCellRightClick = (e, r, c) => {
    e.preventDefault();
    if (status !== 'playing') return;
    const cell = grid[r][c];
    if (cell.isRevealed) return;

    const nextGrid = grid.map(row => row.map(cellItem => ({ ...cellItem })));
    const targetCell = nextGrid[r][c];
    targetCell.isFlagged = !targetCell.isFlagged;

    // Log the flag action
    dispatch(addMinigameLog({
      row: r,
      col: c,
      action: 'flag',
      value: targetCell.isFlagged ? 1 : 0,
      timestamp: Date.now()
    }));

    setGrid(nextGrid);
    setFlagsPlaced(prev => prev + (targetCell.isFlagged ? 1 : -1));
  };

  const handleEndSession = async (endState, finalGrid) => {
    try {
      const finalGridStr = getFinalGridStr(finalGrid);
      const response = await handleSubmitMinesweeper(selectedLevel.SK, finalGridStr, reduxLogs, endState);

      if (response.success) {
        if (response.result === 'win' || endState === 'win') {
          setEarnedScore(response.scoreEarned || 100);
          setEarnedCoin(response.coinEarned || 0);
          toast.success("Chúc mừng bạn đã dò sạch mìn!");
        } else {
          toast.error("Bùm! Bạn đã dẫm phải mìn.");
        }
        dispatch(clearMinigameLogs());
      }
    } catch (e) {
      console.error('Error submitting minesweeper solution:', e);
      toast.error('Lỗi khi gửi kết quả lên máy chủ!');
    }
  };


  const totalSafeCells = useMemo(() => {
    return rows * cols - minesCount;
  }, [rows, cols, minesCount]);

  const currentScore = useMemo(() => {
    const revealedSafe = grid.length > 0 ? countRevealedSafeCells(grid) : 0;
    return calculateRankPoints(
      selectedLevel ? selectedLevel.maxScoreCap : 1000,
      timer,
      minesCount,
      revealedSafe,
      totalSafeCells
    );
  }, [grid, timer, selectedLevel, minesCount, totalSafeCells]);

  const cellStyle = useMemo(() => {
    const size = cols > 16 ? '24px' : cols > 9 ? '32px' : '42px';
    return {
      '--cell-size': size,
      gridTemplateColumns: `repeat(${cols}, var(--cell-size))`
    };
  }, [cols]);

  return (
    <div className="minesweeper-container animate-fade-in">
      <div className="minesweeper-header" style={{ position: 'relative' }}>
        <button className="btn-back" onClick={handleExit}>
          <IonIcon icon={arrowBackOutline} /> Thoát
        </button>
        <span className="game-title" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>💣 Minesweeper</span>
        <div className="header-actions"></div>
      </div>

      <div className="minesweeper-content">
        {isSelectingLevel ? (
          <div className="level-selection-screen animate-fade-in">
            <div className="level-selection-inner">
              <div className="level-selection-header-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
                <h2 className="text-gradient" style={{ margin: 0, fontSize: '2rem' }}>Chọn Màn Chơi</h2>
                <button className="btn-leaderboard-trigger animate-pulse" onClick={() => setShowLeaderboardModal(true)}>
                  <IonIcon icon={trophyOutline} /> Bảng xếp hạng
                </button>
              </div>

              <div className="user-budget-bar">
                <div className="currency-item sanity" title="Sanity">
                  <div className="currency-icon">
                    <img src={currencyAssets.sanity} alt="Sanity" />
                  </div>
                  <div className="currency-info">
                    <span className="currency-label">Sanity</span>
                    <span className="currency-value">{(budget.sanity || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="currency-item ecoin" title="eCoin">
                  <div className="currency-icon">
                    <img src={currencyAssets.eCoin} alt="eCoin" />
                  </div>
                  <div className="currency-info">
                    <span className="currency-label">eCoin</span>
                    <span className="currency-value">{(budget.eCoin || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>


              <div className="total-score-bar">
                <span>🏆 Tổng điểm tích lũy: <strong>{totalAccumulatedScore.toLocaleString()}</strong> Điểm</span>
              </div>

              <div className="level-grid">
                {levels.map(level => {
                  const hasScore = !!level.score;
                  const personalBest = level.score?.personalBest || 0;
                  const achievedAt = level.score?.achievedAt
                    ? new Date(level.score.achievedAt * 1000).toLocaleDateString("vi-VN")
                    : null;

                  const cost = level.sanityCost || 0;

                  // Logic kiểm tra khóa màn chơi
                  let isLocked = false;
                  if (level.requiredLevel) {
                    const reqLvl = levels.find(l => l.SK === level.requiredLevel);
                    if (reqLvl && !reqLvl.score) {
                      isLocked = true;
                    }
                  }

                  return (
                    <button
                      key={level.SK}
                      className={`btn-level ${hasScore ? 'cleared' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => {
                        if (isLocked) {
                          return;
                        }
                        handleLevelSelect(level);
                      }}
                      style={{
                        position: 'relative',
                        opacity: isLocked ? 0.6 : 1,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        filter: isLocked ? 'grayscale(100%)' : 'none'
                      }}
                    >
                      {isLocked ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.6)', zIndex: 10 }}>
                          <IonIcon icon={lockClosedOutline} style={{ fontSize: '3.5rem', color: 'rgba(255, 255, 255, 0.9)' }} />
                        </div>
                      ) : null}
                      <span className="level-name" style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                        {level.name}
                      </span>

                      {hasScore ? (
                        <span className="level-highscore">
                          <span className="hs-score">🏆 {personalBest.toLocaleString()}</span>
                          <span className="hs-date">{achievedAt}</span>
                        </span>
                      ) : (
                        <span className="level-no-record" style={{ color: isLocked ? '#94a3b8' : '#fca5a5' }}>
                          Chưa vượt qua
                        </span>
                      )}

                      {cost > 0 && (
                        <span className="level-cost" style={{ marginTop: '5px' }}>
                          <IonIcon icon={flashOutline} /> Phí: {cost}
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
            <div className="minesweeper-stats">
              <div className="stat-card">
                <span className="label">Độ khó</span>
                <span className="value text-gradient">Level {selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1}</span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={timeOutline} /> Thời gian</span>
                <span className="value timer">{formatTime(timer)}</span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={flagOutline} /> Số cờ</span>
                <span className="value mistakes">
                  {flagsPlaced} / {minesCount}
                </span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={trophyOutline} /> Điểm </span>
                <span className="value coins">
                  🏆 {currentScore.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="board-and-controls">
              <div className="minesweeper-board-wrapper">
                <div
                  className={`minesweeper-board ${status !== 'playing' ? 'blur' : ''}`}
                  style={cellStyle}
                >
                  {grid.map((row, rIdx) =>
                    row.map((cell, cIdx) => {
                      let cellClass = 'minesweeper-cell';
                      let content = null;

                      if (cell.isRevealed) {
                        cellClass += ' cell-revealed';
                        if (cell.isMine) {
                          cellClass += ' cell-mine';
                          content = '💣';
                        } else if (cell.neighborMines > 0) {
                          cellClass += ` cell-num-${cell.neighborMines}`;
                          content = cell.neighborMines;
                        }
                      } else if (cell.isFlagged) {
                        cellClass += ' cell-flagged';
                        content = <IonIcon icon={flagOutline} />;
                      }

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={cellClass}
                          onClick={() => handleCellClick(rIdx, cIdx)}
                          onContextMenu={(e) => handleCellRightClick(e, rIdx, cIdx)}
                        >
                          {content}
                        </div>
                      );
                    })
                  )}
                </div>

                {status === 'won' && (
                  <div className="minesweeper-modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(10, 4, 22, 0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                  }}>
                    <div className="board-overlay glass won-overlay animate-bounce-in" style={{ position: 'relative', width: 'auto', minWidth: '350px', padding: '30px 40px', borderRadius: '16px' }}>
                      <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                      <h3 className="text-gradient">Chiến Thắng!</h3>
                      <p>Bạn đã hoàn thành Màn {selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1} trong {formatTime(timer)}!</p>
                      <p className="earned-pcoin">🏆 +{earnedScore.toLocaleString()} Điểm Rank</p>
                      {earnedCoin > 0 && (
                        <p className="earned-entain">💎 +{earnedCoin.toLocaleString()} eCoin</p>
                      )}
                      <div className="overlay-actions">
                        <button className="btn-glow green" onClick={onClose}>
                          Quay lại Hub
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {status === 'lost' && (
                  <div className="minesweeper-modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(10, 4, 22, 0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                  }}>
                    <div className="board-overlay glass lost-overlay animate-bounce-in" style={{ position: 'relative', width: 'auto', minWidth: '350px', padding: '30px 40px', borderRadius: '16px' }}>
                      <IonIcon icon={closeOutline} style={{ fontSize: 60, color: '#ef4444' }} />
                      <h3 className="text-gradient red-gradient" style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Thất Bại!</h3>
                      <p>Bạn đã dẫm phải mìn ở Màn {selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1}.</p>
                      <p className="earned-entain" style={{ color: '#f87171' }}>⚡ Hoàn lại 50% chi phí vào cổng: +{Math.floor(sanityCostPaid * 0.5)} Sanity</p>
                      <div className="overlay-actions">
                        <button className="btn-glow red" style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }} onClick={onClose}>
                          Quay lại Hub
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {confirmDialog.isOpen && (
                  <div className="minesweeper-modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(10, 4, 22, 0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                  }}>
                    <div className="board-overlay glass animate-bounce-in" style={{ position: 'relative', width: 'auto', minWidth: '350px', padding: '30px 40px', borderRadius: '16px' }}>
                      <h3 className="text-gradient" style={{ color: '#fff', textShadow: 'none', background: 'none', WebkitTextFillColor: '#fff', fontSize: '1.5rem', textAlign: 'center' }}>Xác nhận</h3>
                      <p style={{ fontSize: '1rem', marginBottom: '25px', lineHeight: '1.5', textAlign: 'center' }}>{confirmDialog.message}</p>
                      <div className="overlay-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button className="btn-glow green" onClick={confirmDialog.onConfirm}>
                          Đồng ý
                        </button>
                        <button className="btn-glow red" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="controls-pad">

                <div className="keyboard-tip">
                  💡 Mẹo: Click chuột trái để mở ô, click chuột phải để đặt cờ cảnh báo mìn.
                </div>
              </div>
            </div>
          </>
        )}

        {showLeaderboardModal && (
          <div className="minesweeper-modal-overlay animate-fade-in" onClick={() => setShowLeaderboardModal(false)}>
            <div className="minesweeper-modal-content animate-bounce-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><IonIcon icon={trophyOutline} /> Bảng Xếp Hạng Cosmic</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    className={`btn-refresh ${loadingLeaderboard ? 'spinning' : ''}`}
                    onClick={() => fetchLeaderboard(leaderboardTab, true)}
                    disabled={loadingLeaderboard}
                    title="Làm mới"
                  >
                    <IonIcon icon={refreshOutline} />
                  </button>
                  <button className="btn-close" onClick={() => setShowLeaderboardModal(false)}>
                    <IonIcon icon={closeOutline} />
                  </button>
                </div>
              </div>

              <div className="modal-body">
                {loadingLeaderboard ? (
                  <div className="modal-loading-spinner">
                    <div className="spinner-ring"></div>
                    <span>Đang tải bảng xếp hạng...</span>
                  </div>
                ) : (
                  <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th className="col-rank">Hạng</th>
                          <th className="col-username">Người chơi</th>
                          <th className="col-completed">Số màn vượt qua</th>
                          <th className="col-score">Điểm Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!leaderboardData || leaderboardData.length === 0) ? (
                          <tr>
                            <td colSpan="4" className="empty-message">
                              Chưa có dữ liệu xếp hạng.
                            </td>
                          </tr>
                        ) : (
                          leaderboardData.map((entry, index) => {
                            const isCurrentUser = entry.userId === userInfo.UserId;
                            const rank = entry.rank ?? index + 1;
                            return (
                              <tr key={entry.userId} className={isCurrentUser ? 'current-user-row' : ''}>
                                <td className="col-rank">
                                  {rank === 1 && <span className="rank-badge gold">1</span>}
                                  {rank === 2 && <span className="rank-badge silver">2</span>}
                                  {rank === 3 && <span className="rank-badge bronze">3</span>}
                                  {rank > 3 && rank}
                                </td>
                                <td className="col-username">
                                  <UserAvatar
                                    avatarUrl={entry.displayInfo?.avatarUrl}
                                    alt={entry.displayInfo?.name || 'avatar'}
                                    className="leaderboard-avatar"
                                  />
                                  <span className="username-text">
                                    {entry.displayInfo?.name || entry.displayInfo?.username || entry.userId || 'Vô danh'}
                                  </span>
                                  {isCurrentUser && <span className="current-user-tag">Bạn</span>}
                                </td>
                                <td className="col-completed">
                                  {entry.levelsCompleted || 0}
                                </td>
                                <td className="col-score">
                                  🏆 {(entry.totalScore || 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinesweeperGame;
