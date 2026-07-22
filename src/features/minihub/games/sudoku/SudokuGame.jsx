import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  closeOutline, refreshOutline,
  pencilOutline, trashOutline, helpCircleOutline, arrowBackOutline,
  trophyOutline, heartOutline, timeOutline, alertCircleOutline,
  checkmarkDoneOutline, flashOutline, lockClosedOutline, bugOutline
} from 'ionicons/icons';

import { handleStartSudokuSession, handleCheckSudokuStep, handleSubmitSudoku, handleGetLeaderboardApi } from '../../../../services/minigameServices';
import { setProfile } from '../../../../store/actions/profileActions';
import UserAvatar from '../../../../components/UserAvatar';
import { toast } from 'react-toastify';
import currencyAssets from '../../../../data/currencyAssets';
import './SudokuGame.scss';
import {
  clearMinigameLogs,
  addMinigameLog,
  saveMinigameFinalResult
} from '../../../../store/actions/minigameLogActions';

// ═══ Sudoku Campaign Helpers & Mock DB ═══

const parseGridString = (gridString, targetSize) => {
  const size = targetSize || (gridString ? Math.sqrt(gridString.length) : 9);
  if (!gridString || typeof gridString !== 'string' || gridString.length < size * size) {
    console.error("[SudokuGame] Lỗi gridString không hợp lệ:", gridString);
    return Array(size).fill(null).map(() => Array(size).fill(0));
  }
  const grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(parseInt(gridString[r * size + c], 36) || 0);
    }
    grid.push(row);
  }
  return grid;
};

const getBlockDimensions = (size) => {
  if (size === 9) return { r: 3, c: 3 };
  if (size === 6) return { r: 2, c: 3 };
  if (size === 4) return { r: 2, c: 2 };
  if (size === 12) return { r: 3, c: 4 };
  if (size === 16) return { r: 4, c: 4 };
  const root = Math.floor(Math.sqrt(size));
  return { r: root, c: Math.ceil(size / root) };
};

const getLevelIdFromSK = (sk) => {
  const match = sk.match(/sudoku#level_(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};


const calculateRankPoints = (maxScoreCap, timeSpentSeconds, emptyCellsCount, currentCheckCount) => {
  if (!maxScoreCap) return 0;

  const effectivePenaltyTime = Math.max(0, timeSpentSeconds - emptyCellsCount * 5);

  // 1. Công thức tính điểm cơ bản (đã sửa level.maxScoreCap thành maxScoreCap)
  let score = maxScoreCap * (1 - Math.floor(effectivePenaltyTime / 10) * 0.01);

  // 2. Điểm sàn 10%
  const minScore = Math.floor(maxScoreCap * 0.1);
  if (score < minScore) {
    score = minScore;
  }

  // 3. Thưởng/Phạt theo checkCount
  const maxCheckCount = 5;
  if (currentCheckCount === maxCheckCount) {
    // Thưởng 50% nếu không mất lượt check nào
    score = Math.floor(score * 1.5);
  } else {
    // Giảm 5% cho mỗi lượt check bị mất
    const lostChecks = maxCheckCount - currentCheckCount;
    score = Math.floor(score * Math.pow(0.95, lostChecks));
  }

  return score;
};

const SudokuGame = ({ onClose }) => {
  const dispatch = useDispatch();

  // 👈 Lấy log hiện tại từ Redux để sử dụng cho việc test hoặc gửi lên server
  const reduxLogs = useSelector(state => state.minigameLogs?.actionLogs || []);

  const economy = useSelector(state => state.economy || { pCoins: 0 });
  const minigameHighscores = useSelector(state => state.minigameHighscores || {});
  const userInfo = useSelector(state => state.userInfo || {});

  // 1. Lấy dữ liệu profile chuẩn từ Redux (dựa theo cấu trúc state.profile.userProfile)
  const userProfile = useSelector(state => state.profile?.userProfile || {});

  // 2. Lấy budget từ userProfile, nếu chưa load kịp thì gán giá trị mặc định là 0 (không dùng số ảo nữa)
  const budget = userProfile.budget || {
    knowledgePoint: 0,
    knowledgeCore: 0,
    sanity: 0,
    eCoin: 0
  };

  const currentSanity = budget.sanity || 0;


  const [leaderboardTab, setLeaderboardTab] = useState('GLOBAL');
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // High scores & currency earned for completed match
  const [earnedScore, setEarnedScore] = useState(0);
  const [earnedCoin, setEarnedCoin] = useState(0);

  // Game configuration & status
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [sanityCostPaid, setSanityCostPaid] = useState(0);
  const [isSelectingLevel, setIsSelectingLevel] = useState(true);

  const [gridSize, setGridSize] = useState(9);
  const [board, setBoard] = useState([]);
  const [initialBoard, setInitialBoard] = useState([]);
  const [solution, setSolution] = useState(null);
  
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  const [selectedCell, setSelectedCell] = useState(null);
  const [checkCount, setCheckCount] = useState(0);
  const [wrongCells, setWrongCells] = useState(new Set());
  const [status, setStatus] = useState('idle');
  const [timer, setTimer] = useState(0);

  const levels = useSelector(state => state.minigame?.sudokuLevels || []);

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
      // Nếu màn chơi có score, cộng personalBest vào tổng, ngược lại cộng 0
      return sum + (level.score?.personalBest || 0);
    }, 0);
  }, [levels]);

  const fetchLeaderboard = useCallback(async (tab = leaderboardTab, forceRefresh = false) => {
    try {
      setLoadingLeaderboard(true);
      const response = await handleGetLeaderboardApi('sudoku');

      if (response?.success) {
        setLeaderboardData(response.topPlayers || []);
      } else {
        toast.error(response.error || 'Không thể tải bảng xếp hạng!');
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

  // ═══ Initialize Game ═══
  const initFixedLevel = (level, costPaid, initialGridStr, serverCheckCount) => {
    let configSize = level?.baseMapConfig?.gridSize;
    let targetSize = 9;
    if (configSize) {
      targetSize = parseInt(configSize, 10);
    } else if (initialGridStr) {
      targetSize = Math.sqrt(initialGridStr.length);
    }

    const parsedInitial = parseGridString(initialGridStr, targetSize);
    setGridSize(targetSize);
    setBoard(parsedInitial.map(row => [...row]));
    setInitialBoard(parsedInitial.map(row => [...row]));
    setSolution(null);

    // 👈 KIỂM TRA & XOÁ LOG CŨ BẰNG ACTION CREATOR
    dispatch(clearMinigameLogs());
    console.log(">>> [LOG REDUX] Đã xóa log phiên cũ, chuẩn bị ghi nhận phiên mới.");

    setCheckCount(serverCheckCount);
    setWrongCells(new Set());
    setTimer(0);
    setSelectedCell(null);
    setSelectedLevel(level);
    setSanityCostPaid(costPaid);
    setIsSelectingLevel(false);
    setStatus('playing');
  };

  const handleLevelSelect = async (level) => {
    const targetSK = level.SK;
    const cost = level.sanityCost || level.unlockCostSanity || 0;

    try {
      const response = await handleStartSudokuSession('sudoku', targetSK);

      if (response && (response.success || response.errCode === 0)) {
        const newBudget = response.profile?.budget || response.budget;
        if (newBudget) {
          const nextUserInfo = { ...userInfo, budget: newBudget };
          dispatch(setProfile(nextUserInfo));
        }
        const puzzleGrid = response.sessionData?.puzzleGrid || response.sessionData?.seed || response.initialGrid;
        const initialCheckCount = response.sessionData?.checkCount;
        if (!puzzleGrid || puzzleGrid.length < 16) {
          toast.error("Lỗi: Máy chủ không trả về dữ liệu đề bài Sudoku.");
          return;
        }

        initFixedLevel(level, cost, puzzleGrid, initialCheckCount);

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
            const levelId = selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : "level_01";
            // Gửi API thoát sớm để lấy lại 50% sanity
            await handleSubmitSudoku(levelId, "", reduxLogs, 'quit');

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

  const handleCellClick = (row, col) => {
    if (status !== 'playing') return;
    setSelectedCell({ row, col });
  };

  // ═══ GHI LOG KHI ĐIỀN SỐ VÀO REDUX ═══
  const inputNumber = useCallback((num) => {
    if (status !== 'playing' || !selectedCell) return;
    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) return;

    // 👈 Dispatch action thêm log điền số
    dispatch(addMinigameLog({
      row,
      col,
      timestamp: Date.now()
    }));

    const updatedBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? num : val))
    );
    setBoard(updatedBoard);

    setWrongCells(prev => {
      const next = new Set(prev);
      next.delete(`${row}-${col}`);
      return next;
    });
  }, [board, selectedCell, status, initialBoard, dispatch]);

  // ═══ GHI LOG KHI XÓA SỐ VÀO REDUX ═══
  const eraseCell = () => {
    if (status !== 'playing' || !selectedCell) return;
    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) return;

    // 👈 Dispatch action thêm log xóa số
    dispatch(addMinigameLog({
      row,
      col,
      timestamp: Date.now()
    }));

    const updatedBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? 0 : val))
    );
    setBoard(updatedBoard);

    setWrongCells(prev => {
      const next = new Set(prev);
      next.delete(`${row}-${col}`);
      return next;
    });
  };

  const handleServerCheck = async () => {
    if (status !== 'playing' || checkCount <= 0) return;

    try {
      const currentGridStr = board.flat().map(num => num.toString(36)).join('');
      // Gọi API lên server
      const response = await handleCheckSudokuStep(currentGridStr, reduxLogs);

      if (response.success) {
        setCheckCount(response.checkCount);
        toast.dismiss('sudoku-check');
        if (response.isBoardCorrect) {
          toast.success(`Tất cả các số hiện tại đều hợp lệ!`, { toastId: 'sudoku-check' });
          setWrongCells(new Set()); // Xóa highlight sai
        } else {
          toast.warn(`Phát hiện lỗi sai trên bàn cờ!`, { toastId: 'sudoku-check' });
          highlightConflicts(); // Bật highlight local lên để gợi ý
        }
      }
    } catch (e) {
      toast.error(e.message || "Lỗi kết nối khi kiểm tra.");
    }
  };

  // ═══ CHỨC NĂNG TEST NỘP BÀI GIẢ LẬP (LƯU REDUX) ═══
  const handleFakeComplete = () => {
    if (status !== 'playing') return;

    const finalGridStr = board.flat().map(num => num.toString(36)).join('');

    const finalSessionData = {
      finalGrid: finalGridStr,
      completedAt: Date.now()
    };

    // 👈 Dispatch action lưu kết quả cuối cùng
    dispatch(saveMinigameFinalResult(finalSessionData));

    console.log(">>> [TEST REDUX] Đã mô phỏng nộp bài thành công!");
    console.log(">>> [TEST REDUX] Dữ liệu chuẩn bị gửi server sẽ là:", JSON.stringify(finalSessionData, null, 2));

  };

  const handleCheckBoard = async () => {
    if (status !== 'playing') return;

    const isBoardFilled = board.every(row => row.every(val => val !== 0));
    if (!isBoardFilled) {
      toast.info('💡 Hãy điền đầy đủ ô trên bàn cờ trước khi nộp bài!');
      return;
    }

    const performSubmit = async () => {
      try {
        const levelId = selectedLevel ? selectedLevel.SK : "level_01";
        const finalGridStr = board.flat().map(num => num.toString(36)).join('');

        // Gọi API nộp bài kèm logs
        const response = await handleSubmitSudoku(levelId, finalGridStr, reduxLogs, 'win');

        if (response.success) {
          if (response.result === 'win') {
            setStatus('won');
            setEarnedScore(response.score);
            setEarnedCoin(response.eCoinReward);
          } else {
            // Backend trả về result: "lost" nếu giải sai
            setStatus('lost');
          }
          dispatch(clearMinigameLogs());
        }
      } catch (e) {
        console.error('Error submitting sudoku solution:', e);
        toast.error('Lỗi khi gửi kết quả lên máy chủ!');
      }
    };

    if (checkCount === 0) {
      performSubmit();
    } else {
      setConfirmDialog({
        isOpen: true,
        message: "Bạn chỉ có 1 lần nộp bài duy nhất. Bạn có chắc chắn nộp?",
        onConfirm: async () => {
          setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
          performSubmit();
        }
      });
    }
  };

  const highlightConflicts = () => {
    const newWrongCells = new Set();
    const size = gridSize;

    for (let i = 0; i < size; i++) {
      const rowMap = {};
      const colMap = {};
      for (let j = 0; j < size; j++) {
        const valRow = board[i][j];
        if (valRow !== 0) {
          if (rowMap[valRow] !== undefined) {
            newWrongCells.add(`${i}-${j}`);
            newWrongCells.add(`${i}-${rowMap[valRow]}`);
          } else {
            rowMap[valRow] = j;
          }
        }

        const valCol = board[j][i];
        if (valCol !== 0) {
          if (colMap[valCol] !== undefined) {
            newWrongCells.add(`${j}-${i}`);
            newWrongCells.add(`${colMap[valCol]}-${i}`);
          } else {
            colMap[valCol] = j;
          }
        }
      }
    }

    const blockDims = getBlockDimensions(size);
    for (let rBlock = 0; rBlock < size; rBlock += blockDims.r) {
      for (let cBlock = 0; cBlock < size; cBlock += blockDims.c) {
        const blockMap = {};
        for (let r = 0; r < blockDims.r; r++) {
          for (let c = 0; c < blockDims.c; c++) {
            const row = rBlock + r;
            const col = cBlock + c;
            const val = board[row][col];
            if (val !== 0) {
              if (blockMap[val] !== undefined) {
                newWrongCells.add(`${row}-${col}`);
                const [prevR, prevC] = blockMap[val];
                newWrongCells.add(`${prevR}-${prevC}`);
              } else {
                blockMap[val] = [row, col];
              }
            }
          }
        }
      }
    }

    const filteredWrongCells = new Set();
    newWrongCells.forEach(cellKey => {
      const [rStr, cStr] = cellKey.split('-');
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);
      if (initialBoard[r][c] === 0) {
        filteredWrongCells.add(cellKey);
      }
    });

    setWrongCells(filteredWrongCells);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (status !== 'playing' || !selectedCell) return;
      const { row, col } = selectedCell;
      const size = gridSize;

      const numKey = parseInt(e.key, 36);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= size && (e.key.length === 1 && e.key.match(/^[0-9a-zA-Z]$/))) {
        inputNumber(numKey);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        eraseCell();
      } else if (e.key === 'ArrowUp' && row > 0) {
        setSelectedCell({ row: row - 1, col });
      } else if (e.key === 'ArrowDown' && row < size - 1) {
        setSelectedCell({ row: row + 1, col });
      } else if (e.key === 'ArrowLeft' && col > 0) {
        setSelectedCell({ row, col: col - 1 });
      } else if (e.key === 'ArrowRight' && col < size - 1) {
        setSelectedCell({ row, col: col + 1 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, status, inputNumber, gridSize]);

  const isCellHighlighted = (rIdx, cIdx) => {
    if (!selectedCell) return false;
    const { row, col } = selectedCell;
    if (rIdx === row || cIdx === col) return true;
    
    const blockDims = getBlockDimensions(gridSize);
    const blockRow = Math.floor(row / blockDims.r);
    const blockCol = Math.floor(col / blockDims.c);
    const cellBlockRow = Math.floor(rIdx / blockDims.r);
    const cellBlockCol = Math.floor(cIdx / blockDims.c);
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
      <div className="sudoku-header" style={{ position: 'relative' }}>
        <button className="btn-back" onClick={handleExit}>
          <IonIcon icon={arrowBackOutline} /> Thoát
        </button>
        <span className="game-title" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>🔢 Sudoku</span>
        <div className="header-actions"></div>
      </div>

      <div className="sudoku-content">
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
                {levels.length === 0 ? (
                  <div className="levels-loading">Không có dữ liệu màn chơi. Vui lòng thử lại!</div>
                ) : (
                  levels.map(level => {
                    // Lấy dữ liệu TRỰC TIẾP từ object level thay vì thông qua levelHighscores
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
                            toast.warn("Bạn cần vượt qua màn chơi trước đó để mở khóa màn này!");
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

                        {/* RENDER ĐIỂM KỶ LỤC CÁ NHÂN (PERSONAL BEST) CHÍNH XÁC CỦA MÀN NÀY */}
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
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="sudoku-stats">
              <div className="stat-card">
                <span className="label">Độ khó</span>
                <span className="value text-gradient">Level {selectedLevel ? getLevelIdFromSK(selectedLevel.SK) : 1}</span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={timeOutline} /> Thời gian</span>
                <span className="value timer">{formatTime(timer)}</span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={checkmarkDoneOutline} /> Số lần kiểm tra</span>
                <span className={`value mistakes ${checkCount >= 5 ? 'alert' : ''}`}>
                  {checkCount}/5
                </span>
              </div>
              <div className="stat-card">
                <span className="label"><IonIcon icon={trophyOutline} /> Điểm </span>
                <span className="value coins">
                  🏆 {(() => {
                    // Đếm số ô trống từ initialBoard
                    const emptyCellsCount = initialBoard
                      ? initialBoard.reduce((acc, row) => acc + row.filter(val => val === 0).length, 0)
                      : 0;

                    // Gọi hàm tính điểm mới
                    const currentScore = calculateRankPoints(
                      selectedLevel ? selectedLevel.maxScoreCap : 1000,
                      timer,
                      emptyCellsCount,
                      checkCount
                    );

                    return currentScore.toLocaleString();
                  })()}
                </span>
              </div>
            </div>

            <div className="board-and-controls">
              <div className="sudoku-board-wrapper">
                <div 
                  className={`sudoku-board ${status !== 'playing' ? 'blur' : ''}`}
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gridTemplateRows: `repeat(${gridSize}, 1fr)`
                  }}
                >
                  {board.map((r, rIdx) =>
                    r.map((val, cIdx) => {
                      const isLocked = initialBoard[rIdx][cIdx] !== 0;
                      const isSelected = selectedCell && selectedCell.row === rIdx && selectedCell.col === cIdx;
                      const isPeer = isCellHighlighted(rIdx, cIdx);
                      const isMatch = isValueMatch(rIdx, cIdx);
                      const isWrong = wrongCells.has(`${rIdx}-${cIdx}`);
                      
                      const blockDims = getBlockDimensions(gridSize);
                      const isRightEdge = (cIdx + 1) % blockDims.c === 0 && (cIdx + 1) !== gridSize;
                      const isBottomEdge = (rIdx + 1) % blockDims.r === 0 && (rIdx + 1) !== gridSize;

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
                          style={{
                            borderRight: isRightEdge ? '2px solid rgba(255, 255, 255, 0.25)' : undefined,
                            borderBottom: isBottomEdge ? '2px solid rgba(255, 255, 255, 0.25)' : undefined,
                          }}
                          onClick={() => handleCellClick(rIdx, cIdx)}
                        >
                          {val !== 0 ? (
                            <span className="cell-value">{val > 9 ? val.toString(36).toUpperCase() : val}</span>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                {status === 'won' && (
                  <div className="sudoku-modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(10, 4, 22, 0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                  }}>
                    <div className="board-overlay glass won-overlay animate-bounce-in" style={{ position: 'relative', width: 'auto', minWidth: '350px', padding: '30px 40px', borderRadius: '16px' }}>
                      <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                      <h3 className="text-gradient">Chiến Thắng!</h3>
                      <p>Bạn đã hoàn thành Màn {selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1} trong {formatTime(timer)} với {checkCount} lần kiểm tra!</p>
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
                  <div className="sudoku-modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(10, 4, 22, 0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                  }}>
                    <div className="board-overlay glass lost-overlay animate-bounce-in" style={{ position: 'relative', width: 'auto', minWidth: '350px', padding: '30px 40px', borderRadius: '16px' }}>
                      <IonIcon icon={closeOutline} style={{ fontSize: 60, color: '#ef4444' }} />
                      <h3 className="text-gradient red-gradient" style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Thất Bại!</h3>
                      <p>Bàn cờ giải chưa chính xác. Bạn đã bị tính là thua cuộc ở Màn {selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1}.</p>
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
                  <div className="sudoku-modal-overlay animate-fade-in" style={{
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
                <div className="action-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', width: '100%' }}>
                  <button
                    className="btn-ctrl"
                    onClick={eraseCell}
                    title="Xóa số tự điền"
                    style={{ flex: 1, padding: '10px 0', justifyContent: 'center' }}
                  >
                    <IonIcon icon={trashOutline} />
                    <span>Xóa</span>
                  </button>

                  <button
                    className="btn-ctrl btn-check"
                    onClick={handleServerCheck}
                    disabled={checkCount <= 0}
                    title="Kiểm tra với Server"
                    style={{ flex: 1, padding: '10px 0', justifyContent: 'center', ...(checkCount <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                  >
                    <IonIcon icon={checkmarkDoneOutline} />
                    <span>Kiểm tra ({checkCount}/5)</span>
                  </button>
                  <button
                    className="btn-ctrl btn-submit"
                    onClick={handleCheckBoard}
                    disabled={board.length === 0 || !board.every(row => row.every(val => val !== 0))}
                    title="Nộp bài"
                    style={{
                      flex: 1, padding: '10px 0', justifyContent: 'center',
                      background: (board.length > 0 && board.every(row => row.every(val => val !== 0)))
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: (board.length > 0 && board.every(row => row.every(val => val !== 0))) ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                      opacity: (board.length > 0 && board.every(row => row.every(val => val !== 0))) ? 1 : 0.5,
                      cursor: (board.length > 0 && board.every(row => row.every(val => val !== 0))) ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <IonIcon icon={trophyOutline} />
                    <span>Nộp bài</span>
                  </button>
                </div>

                <div 
                  className="number-pad"
                  style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(gridSize))}, 1fr)` }}
                >
                  {Array.from({ length: gridSize }, (_, i) => i + 1).map(num => {
                    let numCount = 0;
                    board.forEach(row => row.forEach(val => {
                      if (val === num) numCount++;
                    }));
                    const isCompleted = numCount >= gridSize;

                    return (
                      <button
                        key={num}
                        className={`num-btn ${isCompleted ? 'completed' : ''}`}
                        onClick={() => inputNumber(num)}
                      >
                        {num > 9 ? num.toString(36).toUpperCase() : num}
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
        
        {showLeaderboardModal && (
          <div className="sudoku-modal-overlay animate-fade-in" onClick={() => setShowLeaderboardModal(false)}>
            <div className="sudoku-modal-content animate-bounce-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><IonIcon icon={trophyOutline} /> Bảng Xếp Hạng</h3>
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
                                  <span className="name-text">{entry.displayInfo?.name || 'Ẩn danh'}</span>
                                </td>
                                <td className="col-completed">{entry.levelsCompleted || 0}</td>
                                <td className="col-score">{entry.totalScore?.toLocaleString()} pts</td>
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

export default SudokuGame;
