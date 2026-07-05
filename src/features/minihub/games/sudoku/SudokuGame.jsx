import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  closeOutline, refreshOutline,
  pencilOutline, trashOutline, helpCircleOutline, arrowBackOutline,
  trophyOutline, heartOutline, timeOutline, alertCircleOutline,
  checkmarkDoneOutline, flashOutline, lockClosedOutline // 👈 Thêm icon này
} from 'ionicons/icons';

import { handleStartSession } from '../../../../services/minigameServices';
import { toast } from 'react-toastify';
import './SudokuGame.scss';

// ═══ Sudoku Campaign Helpers & Mock DB ═══

const parseGridString = (gridString) => {
  // Bắt lỗi nếu gridString bị undefined, null, hoặc không đủ 81 ký tự
  if (!gridString || typeof gridString !== 'string' || gridString.length < 81) {
    console.error("[SudokuGame] Lỗi gridString không hợp lệ:", gridString);
    // Trả về bảng toàn số 0 mặc định để app không bị crash màn hình trắng
    return Array(9).fill(null).map(() => Array(9).fill(0));
  }

  const grid = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(parseInt(gridString[r * 9 + c], 10) || 0); // Thêm fallback || 0
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

// MOCK_LEVELS removed - levels are fetched from the database via GetLevelsService
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
  const sudokuLeaderboard = useSelector(state => state.sudokuLeaderboard || {
    GLOBAL: { data: null, lastFetchedAt: null },
    FRIENDS: { data: null, lastFetchedAt: null }
  });
  const userInfo = useSelector(state => state.userInfo || {});
  const budget = userInfo.budget || {
    knowledgePoint: 1500,
    knowledgeCore: 10,
    sanity: 5000,
    eCoin: 300
  };
  const currentSanity = budget.sanity;

  // Action logs for zero-trust anti-cheat validation
  const [actionLogs, setActionLogs] = useState([]);

  // Leaderboard UI modal controls
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('GLOBAL'); // 'GLOBAL' or 'FRIENDS'
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // High scores & currency earned for completed match
  const [earnedScore, setEarnedScore] = useState(0);
  const [earnedCoin, setEarnedCoin] = useState(0);

  // Game configuration & status
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [sanityCostPaid, setSanityCostPaid] = useState(0); // Track sanity spent for current match
  const [isSelectingLevel, setIsSelectingLevel] = useState(true);

  const [board, setBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [initialBoard, setInitialBoard] = useState(Array(9).fill(null).map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(null); // solutionGrid remains on the server

  const [selectedCell, setSelectedCell] = useState(null); // { row, col }
  const [checkCount, setCheckCount] = useState(0);
  const [wrongCells, setWrongCells] = useState(new Set());
  const [status, setStatus] = useState('idle'); // 'idle', 'playing', 'won', 'lost'
  const [timer, setTimer] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(3);
  // 1. Lấy danh sách levels đã được handleSyncSudokuLevels lưu vào Redux
  const levels = useSelector(state => state.minigame?.sudokuLevels || []);

  // 2. Chuyển đổi dữ liệu highscores từ cục 'score' mà backend trả về (thay vì tìm trong minigameHighscores)
  const levelHighscores = useMemo(() => {
    const result = {};
    levels.forEach(level => {
      const levelId = level.levelId || getLevelIdFromSK(level.SK);
      // Backend của bạn trả về: score: { personalBest, achievedAt } hoặc null
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

  // 3. Tính tổng điểm
  const totalAccumulatedScore = useMemo(() => {
    return Object.values(levelHighscores).reduce((sum, entry) => sum + (entry.score || 0), 0);
  }, [levelHighscores]);
  // ═══ Fetch Leaderboard (Redux Cache-first) ═══
  const fetchLeaderboard = useCallback(async (tab = leaderboardTab, forceRefresh = false) => {
    const cache = sudokuLeaderboard[tab];
    const cacheTime = cache?.lastFetchedAt;
    const isCacheValid = cacheTime && (Date.now() - cacheTime < 300000); // 5 minutes TTL

    if (isCacheValid && !forceRefresh) {
      console.log(`Using cached ${tab} leaderboard.`);
      return;
    }

    try {
      setLoadingLeaderboard(true);
      console.log(`Fetching ${tab} leaderboard from server (force: ${forceRefresh})...`);
      const response = await apiCall('/sudoku/leaderboard', {
        method: 'POST',
        body: JSON.stringify({
          userId: userInfo.UserId || 'usr_local',
          gameId: 'sudoku',
          type: tab
        })
      });

      if (response && response.errCode === 0) {
        dispatch(setSudokuLeaderboard({
          type: tab,
          data: response.leaderboard || [],
          timestamp: Date.now()
        }));
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
    if (showLeaderboardModal) {
      fetchLeaderboard(leaderboardTab);
    }
  }, [showLeaderboardModal, leaderboardTab, fetchLeaderboard]);

  // ═══ Timer Effect ═══
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // ═══ Initialize Game ═══
  const initFixedLevel = (level, costPaid, initialGridStr) => {
    const parsedInitial = parseGridString(initialGridStr);
    setBoard(parsedInitial.map(row => [...row]));
    setInitialBoard(parsedInitial.map(row => [...row]));
    setSolution(null); // Keep solution secure on server
    setActionLogs([]); // Reset action logs at start of session
    setCheckCount(0);
    setWrongCells(new Set());
    setTimer(0);
    setHintsLeft(3);
    setSelectedCell(null);
    setSelectedLevel(level);
    setSanityCostPaid(costPaid);
    setIsSelectingLevel(false);
    setStatus('playing');
    toast.info(`Màn ${level.levelId || getLevelIdFromSK(level.SK)} bắt đầu!`);
  };

  const handleLevelSelect = async (level) => {
    const displayLevelId = level.levelId || getLevelIdFromSK(level.SK);
    const targetSK = level.SK;
    const cost = level.sanityCost || level.unlockCostSanity || 0;

    try {
      toast.info(`Đang tạo ván đấu Màn ${displayLevelId}...`);
      const response = await handleStartSession('sudoku', targetSK);

      if (response && (response.success || response.errCode === 0)) {

        const newBudget = response.profile?.budget || response.budget;
        if (newBudget) {
          const nextUserInfo = { ...userInfo, budget: newBudget };
          dispatch(userLogin(nextUserInfo));
        }

        // Lấy dữ liệu đề bài. Dự phòng trường hợp server gán đề bài vào biến 'seed'
        const puzzleGrid = response.sessionData?.puzzleGrid || response.sessionData?.seed || response.initialGrid;

        // Kiểm tra chặn luồng nếu dữ liệu bàn chơi vẫn rỗng
        if (!puzzleGrid || puzzleGrid.length < 81) {
          toast.error("Lỗi: Máy chủ không trả về dữ liệu đề bài Sudoku.");
          console.error("Thiếu puzzleGrid trong response:", response);
          return; // Dừng lại ở đây, không gọi initFixedLevel
        }

        initFixedLevel(level, cost, puzzleGrid);

      } else {
        toast.error(response.error || response.message || `Không thể bắt đầu Màn ${displayLevelId}.`);
      }
    } catch (e) {
      console.error('Error starting game session:', e);
      toast.error('Không thể kết nối máy chủ để bắt đầu trận đấu!');
    }
  };
  // ═══ Handle Exit Mid-Game (Refund 50% Sanity via Server API) ═══
  const handleExit = async () => {
    if (status === 'playing') {
      try {
        const levelId = selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1;
        const response = await apiCall('/sudoku/end-session', {
          method: 'POST',
          body: JSON.stringify({
            userId: userInfo.UserId || 'usr_local',
            gameId: 'sudoku',
            levelId: levelId,
            endState: 'quit'
          })
        });

        if (response && response.errCode === 0) {
          // Sync updated budget to Redux
          const nextUserInfo = { ...userInfo, budget: response.budget };
          dispatch(userLogin(nextUserInfo));
          toast.info(`Bạn đã thoát trận. Hoàn lại ${response.refundSanity} Sanity!`);
        } else {
          toast.error(response.error || 'Có lỗi khi thoát trận đấu.');
        }
      } catch (e) {
        console.error('Error exiting game session:', e);
      }
    }
    onClose();
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

    if (initialBoard[row][col] !== 0) return;

    setActionLogs(prev => [...prev, {
      row,
      col,
      action: 'inputNumber',
      value: num,
      timestamp: Date.now()
    }]);

    const updatedBoard = board.map((r, rIdx) =>
      r.map((val, cIdx) => (rIdx === row && cIdx === col ? num : val))
    );
    setBoard(updatedBoard);

    setWrongCells(prev => {
      const next = new Set(prev);
      next.delete(`${row}-${col}`);
      return next;
    });
  }, [board, selectedCell, status, initialBoard]);

  // Erase current cell
  const eraseCell = () => {
    if (status !== 'playing' || !selectedCell) return;
    const { row, col } = selectedCell;

    if (initialBoard[row][col] !== 0) return; // Locked

    // Track action for zero-trust validation
    setActionLogs(prev => [...prev, {
      row,
      col,
      action: 'eraseCell',
      value: 0,
      timestamp: Date.now()
    }]);

    const updatedNotes = notes.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? Array(9).fill(false) : c))
    );
    setNotes(updatedNotes);

    // Clear this cell from wrongCells if it was previously marked
    setWrongCells(prev => {
      const next = new Set(prev);
      next.delete(`${row}-${col}`);
      return next;
    });
  };

  // ═══ Local Check (Highlights conflicts without calling server) ═══
  const handleLocalCheck = () => {
    if (status !== 'playing' || checkCount >= 5) return;

    // Increment local check count
    const nextCheckCount = checkCount + 1;
    setCheckCount(nextCheckCount);

    // Highlight conflicts
    highlightConflicts();
  };

  // ═══ Final Submit (Calls Server API and ends session) ═══
  const handleCheckBoard = async () => {
    if (status !== 'playing') return;

    // Check if board is fully filled
    const isBoardFilled = board.every(row => row.every(val => val !== 0));
    if (!isBoardFilled) {
      toast.info('💡 Hãy điền đầy đủ 81 ô trên bàn cờ trước khi nộp bài!');
      return;
    }

    // Confirm submission
    const confirmSubmit = window.confirm(
      "Bạn chỉ có 1 lần nộp bài duy nhất. Nếu sai sẽ bị tính là thua cuộc. Bạn có chắc chắn nộp?"
    );
    if (!confirmSubmit) return;

    try {
      const levelId = selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1;
      const finalGridStr = board.flat().join('');

      toast.info('Đang nộp bài lên server...');

      const response = await apiCall('/sudoku/end-session', {
        method: 'POST',
        body: JSON.stringify({
          userId: userInfo.UserId || 'usr_local',
          gameId: 'sudoku',
          levelId: levelId,
          finalGrid: finalGridStr,
          checkCount: checkCount, // Pass local check count to server
          actionLogs: actionLogs, // Pass action logs for anti-cheat verification
          endState: 'win'
        })
      });

      if (response && response.errCode === 0 && response.result === 'win') {
        setStatus('won');
        setEarnedScore(response.score);
        setEarnedCoin(response.eCoinReward);

        // Sync budget to Redux store
        const nextUserInfo = { ...userInfo, budget: response.budget };
        dispatch(userLogin(nextUserInfo));

        // Sync highscores to Redux store
        const levelKey = `sudoku_level_${levelId}`;
        const dateStr = response.updatedAt
          ? new Date(response.updatedAt * 1000).toLocaleDateString("vi-VN")
          : new Date().toLocaleDateString("vi-VN");

        const highscoreUpdate = { sudoku: response.score };
        highscoreUpdate[levelKey] = { score: response.score, achievedAt: dateStr };
        dispatch(setHighscores(highscoreUpdate));

        toast.success(`🎉 Chúc mừng! Bạn đã thắng cuộc ở Màn ${levelId}!`);
        toast.success(`💎 Nhận +${response.eCoinReward} eCoin thưởng!`);
        toast.success(`🏆 Nhận +${response.score.toLocaleString()} Điểm Rank!`);

        setTimer(response.timeSpent);
      } else {
        // If solution is wrong or server returns error, player has lost the match
        setStatus('lost');
        toast.error(response.message || response.error || '❌ Bàn cờ chưa chính xác. Bạn đã thua cuộc!');

        // Sync updated budget (50% sanity refund) to Redux
        if (response && response.budget) {
          const nextUserInfo = { ...userInfo, budget: response.budget };
          dispatch(userLogin(nextUserInfo));
        }
      }
    } catch (e) {
      console.error('Error submitting sudoku solution:', e);
      toast.error('Lỗi khi gửi kết quả lên máy chủ!');
    }
  };

  // Local helper to highlight conflict inputs (duplicates in same row, column or box)
  const highlightConflicts = () => {
    const newWrongCells = new Set();

    // Check rows & columns
    for (let i = 0; i < 9; i++) {
      const rowMap = {};
      const colMap = {};
      for (let j = 0; j < 9; j++) {
        // Rows
        const valRow = board[i][j];
        if (valRow !== 0) {
          if (rowMap[valRow] !== undefined) {
            newWrongCells.add(`${i}-${j}`);
            newWrongCells.add(`${i}-${rowMap[valRow]}`);
          } else {
            rowMap[valRow] = j;
          }
        }

        // Columns
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

    // Check 3x3 blocks
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
        <button className="btn-back" onClick={handleExit}>
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
              <div className="level-selection-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
                <div>
                  <h2 className="text-gradient" style={{ margin: 0 }}>Vượt ải Sudoku Cosmic</h2>
                  <p className="level-subtitle" style={{ margin: '5px 0 0 0' }}>Vượt qua 20 màn chơi để tích lũy điểm Rank!</p>
                </div>
                <button className="btn-leaderboard-trigger animate-pulse" onClick={() => setShowLeaderboardModal(true)}>
                  <IonIcon icon={trophyOutline} /> Bảng xếp hạng
                </button>
              </div>

              {/* User Budget Display */}
              <div className="user-budget-bar">
                <span className="budget-item sanity">⚡ Sanity: <strong>{(budget.sanity || 0).toLocaleString()}</strong></span>
                <span className="budget-divider">|</span>
                <span className="budget-item entain">💎 eCoin: <strong>{(budget.eCoin || 0).toLocaleString()}</strong></span>
              </div>

              {/* Total Accumulated Score */}
              <div className="total-score-bar">
                <span>🏆 Tổng điểm tích lũy: <strong>{totalAccumulatedScore.toLocaleString()}</strong> Điểm</span>
              </div>

              <div className="level-grid">
                {levels.length === 0 ? (
                  <div className="levels-loading">Không có dữ liệu màn chơi. Vui lòng thử lại!</div>
                ) : (
                  levels.map(level => {
                    const levelId = getLevelIdFromSK(level.SK);
                    const hsData = levelHighscores[levelId];
                    const cost = level.sanityCost || 0;

                    // 1. Kiểm tra điều kiện mở khóa (Dựa vào requiredLevel)
                    let isLocked = false;
                    if (level.requiredLevel) {
                      // Tìm màn chơi mà level này yêu cầu
                      const reqLvl = levels.find(l => l.SK === level.requiredLevel);
                      // Nếu màn chơi yêu cầu đó tồn tại NHƯNG chưa có điểm -> Khóa
                      if (reqLvl && !reqLvl.score) {
                        isLocked = true;
                      }
                    }

                    return (
                      <button
                        key={level.SK}
                        // Loại bỏ màu độ khó cũ, thêm class để styling nếu cần
                        className={`btn-level ${hsData ? 'cleared' : ''} ${isLocked ? 'locked' : ''}`}
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
                        {/* 2. Ổ khóa ở góc phải nếu bị khóa */}
                        {isLocked && (
                          <IonIcon
                            icon={lockClosedOutline}
                            style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '1.2rem', color: '#cbd5e1' }}
                          />
                        )}

                        {/* 3. Hiển thị Tên màn chơi (bỏ số thứ tự và huy hiệu độ khó) */}
                        <span className="level-name" style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                          {level.name}
                        </span>

                        {/* 4. Hiển thị Điểm / Chưa vượt qua */}
                        {hsData ? (
                          <span className="level-highscore">
                            <span className="hs-score">🏆 {hsData.score.toLocaleString()}</span>
                            <span className="hs-date">{hsData.achievedAt}</span>
                          </span>
                        ) : (
                          <span className="level-no-record" style={{ color: isLocked ? '#94a3b8' : '#fca5a5' }}>
                            Chưa vượt qua
                          </span>
                        )}

                        {/* 5. Hiển thị Sanity Cost (Chỉ hiện khi lớn hơn 0) */}
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
                <span className="label"><IonIcon icon={checkmarkDoneOutline} /> Số lần kiểm tra</span>
                <span className={`value mistakes ${checkCount >= 5 ? 'alert' : ''}`}>
                  {checkCount}/5
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

                {/* Win Overlay */}
                {status === 'won' && (
                  <div className="board-overlay glass won-overlay animate-bounce-in">
                    <IonIcon icon={trophyOutline} style={{ fontSize: 60, color: '#fbbf24' }} />
                    <h3 className="text-gradient">Chiến Thắng!</h3>
                    <p>Bạn đã hoàn thành Màn {selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1} ({getDifficultyLabel(selectedLevel ? (selectedLevel.levelId || getLevelIdFromSK(selectedLevel.SK)) : 1)}) trong {formatTime(timer)} với {checkCount} lần kiểm tra!</p>
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

                {/* Loss Overlay */}
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

              {/* Action Pad & Number Pad */}
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
                    onClick={handleLocalCheck}
                    disabled={checkCount >= 5}
                    title="Kiểm tra cục bộ"
                    style={checkCount >= 5 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
        {/* ═══ Leaderboard Modal ═══ */}
        {showLeaderboardModal && (
          <div className="sudoku-modal-overlay animate-fade-in" onClick={() => setShowLeaderboardModal(false)}>
            <div className="sudoku-modal-content animate-bounce-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><IonIcon icon={trophyOutline} /> Bảng Xếp Hạng Cosmic</h3>
                <button className="btn-close" onClick={() => setShowLeaderboardModal(false)}>
                  <IonIcon icon={closeOutline} />
                </button>
              </div>

              <div className="modal-tabs-row">
                <div className="modal-tabs">
                  <button
                    className={`modal-tab ${leaderboardTab === 'GLOBAL' ? 'active' : ''}`}
                    onClick={() => setLeaderboardTab('GLOBAL')}
                  >
                    Toàn cầu
                  </button>
                  <button
                    className={`modal-tab ${leaderboardTab === 'FRIENDS' ? 'active' : ''}`}
                    onClick={() => setLeaderboardTab('FRIENDS')}
                  >
                    Bạn bè
                  </button>
                </div>
                <button
                  className={`btn-refresh ${loadingLeaderboard ? 'spinning' : ''}`}
                  onClick={() => fetchLeaderboard(leaderboardTab, true)}
                  disabled={loadingLeaderboard}
                  title="Làm mới"
                >
                  <IonIcon icon={refreshOutline} />
                </button>
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
                        {(!sudokuLeaderboard[leaderboardTab]?.data || sudokuLeaderboard[leaderboardTab].data.length === 0) ? (
                          <tr>
                            <td colSpan="4" className="empty-message">
                              Chưa có dữ liệu xếp hạng.
                            </td>
                          </tr>
                        ) : (
                          sudokuLeaderboard[leaderboardTab].data.map((entry) => {
                            const isCurrentUser = entry.userId === userInfo.UserId;
                            return (
                              <tr key={entry.userId} className={isCurrentUser ? 'current-user-row' : ''}>
                                <td className="col-rank">
                                  {entry.rank === 1 && <span className="rank-badge gold">1</span>}
                                  {entry.rank === 2 && <span className="rank-badge silver">2</span>}
                                  {entry.rank === 3 && <span className="rank-badge bronze">3</span>}
                                  {entry.rank > 3 && entry.rank}
                                </td>
                                <td className="col-username">
                                  <span className="username-text">
                                    {entry.displayInfo?.username || entry.userId || 'Vô danh'}
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

              <div className="modal-footer">
                <span className="cache-time-info">
                  {sudokuLeaderboard[leaderboardTab]?.lastFetchedAt && (
                    <>Cập nhật lúc: {new Date(sudokuLeaderboard[leaderboardTab].lastFetchedAt).toLocaleTimeString()}</>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SudokuGame;
