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
import './SudokuGame.scss';
import {
  clearMinigameLogs,
  addMinigameLog,
  saveMinigameFinalResult
} from '../../../../store/actions/minigameLogActions';

// ═══ Sudoku Campaign Helpers & Mock DB ═══

const parseGridString = (gridString) => {
  if (!gridString || typeof gridString !== 'string' || gridString.length < 81) {
    console.error("[SudokuGame] Lỗi gridString không hợp lệ:", gridString);
    return Array(9).fill(null).map(() => Array(9).fill(0));
  }
  const grid = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(parseInt(gridString[r * 9 + c], 10) || 0);
    }
    grid.push(row);
  }
  return grid;
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
  const sudokuLeaderboard = useSelector(state => state.sudokuLeaderboard || {
    GLOBAL: { data: null, lastFetchedAt: null },
    FRIENDS: { data: null, lastFetchedAt: null }
  });
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
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // High scores & currency earned for completed match
  const [earnedScore, setEarnedScore] = useState(0);
  const [earnedCoin, setEarnedCoin] = useState(0);

  // Game configuration & status
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [sanityCostPaid, setSanityCostPaid] = useState(0);
  const [isSelectingLevel, setIsSelectingLevel] = useState(true);

  const [board, setBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(null);

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
    const cache = sudokuLeaderboard[tab];
    const cacheTime = cache?.lastFetchedAt;
    const isCacheValid = cacheTime && (Date.now() - cacheTime < 300000);

    if (isCacheValid && !forceRefresh) {
      console.log(`Using cached ${tab} leaderboard.`);
      return;
    }

    try {
      setLoadingLeaderboard(true);
      const response = await handleGetLeaderboardApi('sudoku');

      if (response?.success) {
        dispatch({
          type: 'SET_SUDOKU_LEADERBOARD',
          payload: {
            type: tab,
            data: response.topPlayers || [],
            timestamp: Date.now()
          }
        });
      } else {
        toast.error(response.error || 'Không thể tải bảng xếp hạng!');
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
      toast.error('Lỗi kết nối khi tải bảng xếp hạng!');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [dispatch, sudokuLeaderboard, leaderboardTab, userInfo.UserId]);

  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // ═══ Initialize Game ═══
  const initFixedLevel = (level, costPaid, initialGridStr, serverCheckCount) => {
    const parsedInitial = parseGridString(initialGridStr);
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
    const displayLevelId = getLevelIdFromSK(level.SK);
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
        if (!puzzleGrid || puzzleGrid.length < 81) {
          toast.error("Lỗi: Máy chủ không trả về dữ liệu đề bài Sudoku.");
          return;
        }

        initFixedLevel(level, cost, puzzleGrid, initialCheckCount);

      } else {
        toast.error(response.error || response.message || `Không thể bắt đầu Màn ${displayLevelId}.`);
      }
    } catch (e) {
      console.error('Error starting game session:', e);
      toast.error('Không thể kết nối máy chủ để bắt đầu trận đấu!');
    }
  };

  const handleExit = async () => {
    if (status === 'playing') {
      const confirmExit = window.confirm("Thoát giữa chừng sẽ bị tính là thua. Bạn có chắc chắn?");
      if (!confirmExit) return;

      try {
        const levelId = selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : "level_01";
        // Gửi API thoát sớm để lấy lại 50% sanity
        const response = await handleSubmitSudoku(levelId, "", reduxLogs, 'quit');

        if (response.success) {
          toast.info(`Đã thoát. Hoàn lại ${response.refundSanity} Sanity!`);
        }
      } catch (e) {
        console.error('Error exiting game session:', e);
      }
      dispatch(clearMinigameLogs());
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
      const isBoardFilled = board.every(row => row.every(val => val !== 0));
      if (!isBoardFilled) {
        toast.info('💡 Hãy điền đầy đủ ô trên bàn cờ trước khi kiểm tra!');
        return;
      }
      const currentGridStr = board.flat().join('');
      // Gọi API lên server
      const response = await handleCheckSudokuStep(currentGridStr, reduxLogs);

      if (response.success) {
        setCheckCount(response.checkCount);
        if (response.isBoardCorrect) {
          toast.success(`Bàn cờ hợp lệ tính đến hiện tại! Còn ${response.checkCount} lần kiểm tra.`);
          setWrongCells(new Set()); // Xóa highlight sai
        } else {
          toast.warn(`Có lỗi sai trên bàn cờ! Còn ${response.checkCount} lần kiểm tra.`);
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

    const finalGridStr = board.flat().join('');

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

    const confirmSubmit = window.confirm("Bạn chỉ có 1 lần nộp bài duy nhất. Bạn có chắc chắn nộp?");
    if (!confirmSubmit) return;

    try {
      const levelId = selectedLevel ? selectedLevel.SK : "level_01";
      const finalGridStr = board.flat().join('');

      // Gọi API nộp bài kèm logs
      const response = await handleSubmitSudoku(levelId, finalGridStr, reduxLogs, 'win');

      if (response.success) {
        if (response.result === 'win') {
          setStatus('won');
          setEarnedScore(response.score);
          setEarnedCoin(response.eCoinReward);
          toast.success("Chúc mừng bạn đã thắng!");
        } else {
          // Backend trả về result: "lost" nếu giải sai
          setStatus('lost');
          toast.error("Bàn cờ chưa chính xác, bạn đã thua cuộc.");
        }
        dispatch(clearMinigameLogs());
      }
    } catch (e) {
      console.error('Error submitting sudoku solution:', e);
      toast.error('Lỗi khi gửi kết quả lên máy chủ!');
    }
  };

  const highlightConflicts = () => {
    const newWrongCells = new Set();

    for (let i = 0; i < 9; i++) {
      const rowMap = {};
      const colMap = {};
      for (let j = 0; j < 9; j++) {
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

    for (let rBlock = 0; rBlock < 9; rBlock += 3) {
      for (let cBlock = 0; cBlock < 9; cBlock += 3) {
        const blockMap = {};
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
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

    setWrongCells(newWrongCells);
    if (newWrongCells.size > 0) {
      toast.warn(`Phát hiện ${newWrongCells.size} ô bị trùng lặp quy luật Sudoku!`);
    }
  };

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

  const isCellHighlighted = (rIdx, cIdx) => {
    if (!selectedCell) return false;
    const { row, col } = selectedCell;
    if (rIdx === row || cIdx === col) return true;
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
      <div className="sudoku-header">
        <button className="btn-back" onClick={handleExit}>
          <IonIcon icon={arrowBackOutline} /> Thoát
        </button>
        <span className="game-title">🔢 Sudoku Cosmic</span>
        <div className="header-actions"></div>
      </div>

      <div className="sudoku-content">
        {isSelectingLevel ? (
          <div className="level-selection-screen animate-fade-in">
            <div className="level-selection-inner">
              <div className="level-selection-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
                <div>
                  <h2 className="text-gradient" style={{ margin: 0 }}>Vượt ải Sudoku Cosmic</h2>
                  <p className="level-subtitle" style={{ margin: '5px 0 0 0' }}>Vượt qua 20 màn chơi để tích lũy điểm Rank!</p>
                </div>

              </div>

              <div className="user-budget-bar">
                <span className="budget-item sanity">⚡ Sanity: <strong>{(budget.sanity || 0).toLocaleString()}</strong></span>
                <span className="budget-divider">|</span>
                <span className="budget-item entain">💎 eCoin: <strong>{(budget.eCoin || 0).toLocaleString()}</strong></span>
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
                        {isLocked && (
                          <IonIcon
                            icon={lockClosedOutline}
                            style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '1.2rem', color: '#cbd5e1' }}
                          />
                        )}
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
                <div className={`sudoku-board ${status !== 'playing' ? 'blur' : ''}`}>
                  {board.map((r, rIdx) =>
                    r.map((val, cIdx) => {
                      const isLocked = initialBoard[rIdx][cIdx] !== 0;
                      const isSelected = selectedCell && selectedCell.row === rIdx && selectedCell.col === cIdx;
                      const isPeer = isCellHighlighted(rIdx, cIdx);
                      const isMatch = isValueMatch(rIdx, cIdx);
                      const isWrong = wrongCells.has(`${rIdx}-${cIdx}`);

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
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                {status === 'won' && (
                  <div className="board-overlay glass won-overlay animate-bounce-in">
                    <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                    <h3 className="text-gradient">Chiến Thắng!</h3>
                    <p>Bạn đã hoàn thành Màn {selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1}  trong {formatTime(timer)} với {checkCount} lần kiểm tra!</p>
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
                )}

                {status === 'lost' && (
                  <div className="board-overlay glass lost-overlay animate-bounce-in">
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
                )}
              </div>

              <div className="controls-pad">
                <div className="action-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-ctrl"
                    onClick={eraseCell}
                    title="Xóa số tự điền"
                  >
                    <IonIcon icon={trashOutline} />
                    <span>Xóa</span>
                  </button>

                  <button
                    className="btn-ctrl btn-check"
                    onClick={handleServerCheck}
                    disabled={checkCount <= 0}
                    title="Kiểm tra với Server"
                    style={checkCount <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <IonIcon icon={checkmarkDoneOutline} />
                    <span>Kiểm tra ({checkCount}/5)</span>
                  </button>
                  <button
                    className="btn-ctrl btn-submit"
                    onClick={handleCheckBoard}
                    disabled={!board.every(row => row.every(val => val !== 0))}
                    title="Nộp bài"
                    style={{
                      background: board.every(row => row.every(val => val !== 0))
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'rgba(255, 255, 255, 0.05)',
                      color: board.every(row => row.every(val => val !== 0)) ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                      opacity: board.every(row => row.every(val => val !== 0)) ? 1 : 0.5,
                      cursor: board.every(row => row.every(val => val !== 0)) ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <IonIcon icon={trophyOutline} />
                    <span>Nộp bài</span>
                  </button>
                </div>

                <div className="number-pad">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
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
