import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { playOutline, trophyOutline, gameControllerOutline } from 'ionicons/icons';

import './MinigameHub.scss';

import { handleSyncSudokuLevels, handleGetLeaderboardApi } from '../../services/minigameServices';
import { handleSyncMinesweeperLevels } from '../../services/minesweeperService';
import { toast } from 'react-toastify';
import SudokuGame from './games/sudoku/SudokuGame.jsx';
import MinesweeperGame from './games/minesweeper/MinesweeperGame.jsx';

import UserAvatar from '../../components/UserAvatar';

const MINIGAMES = [
  { id: 'all', label: 'Tổng Wins', icon: '🏅' },
  { id: 'minesweeper', label: 'Minesweeper', icon: '💣' },
  { id: 'sudoku', label: 'Sudoku', icon: '🔢' },
];

// ═══ Arcade Game List ═══
const ArcadeList = ({ onPlayGame }) => (
  <div className="arcade-list">
    <h3><IonIcon icon={gameControllerOutline} /> Available Games</h3>
    <div className="store-grid">
      {[
        { name: 'Minesweeper', price: 100, icon: '💣', disabled: false },
        { name: 'Sudoku', price: 'Free', icon: '🔢', disabled: false },
      ].map(game => (
        <div className="store-item" key={game.name}>
          <div className="item-cover">{game.icon}</div>
          <div className="item-info">
            <span className="item-title">{game.name}</span>
            <span className="item-price">
              {typeof game.price === 'number' ? `🪙 ${game.price} P-Coin / Play` : game.price}
            </span>
            <button
              onClick={() => !game.disabled && onPlayGame(game.name.toLowerCase())}
              style={game.disabled ? { background: '#475569', cursor: 'not-allowed', opacity: 0.6 } : {}}
              disabled={game.disabled}
            >
              <IonIcon icon={playOutline} /> {game.disabled ? 'Coming Soon' : 'Play Now'}
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LeaderboardView = ({ minigameFilter, setMinigameFilter, leaderboardData }) => {
  return (
    <div className="leaderboard-section">
      <div className="section-header">
        <h3><IonIcon icon={trophyOutline} /> Hall of Fame</h3>

      </div>

      <div className="minigame-filter">
          <select
            className="minigame-select"
            value={minigameFilter}
            onChange={e => setMinigameFilter(e.target.value)}
          >
            {MINIGAMES.map(g => (
              <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
            ))}
          </select>
      </div>

      <div className="rank-list">
        {leaderboardData && leaderboardData.length > 0 ? (
          leaderboardData.map((player, i) => (
            <div className={`rank-item ${i < 3 ? `top-${i + 1}` : ''}`} key={i}>
              <div className="rank-number">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div className="player-info">
                <div className="player-avatar">
                  <UserAvatar
                    avatarUrl={player.displayInfo?.avatarUrl}
                    alt={player.displayInfo?.name || 'avatar'}
                    style={{ width: 40, borderRadius: '50%' }}
                  />
                </div>
                <div className="player-details">
                  <div className="name-with-title">
                    <span className="player-name">{player.displayInfo?.name || 'Ẩn danh'}</span>
                  </div>
                  <span className="player-rank-title">Màn đã qua: {player.levelsCompleted || 0}</span>
                </div>
              </div>
              <div className="score-badge">
                {player.totalScore} Điểm
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Chưa có dữ liệu xếp hạng.</div>
        )}
      </div>
    </div>
  );
};
// ═══ Main MinigameHub ═══
class MinigameHub extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'minigame', // Sửa default thành minigame để check ngay lúc vào
      minigameFilter: 'sudoku', // Sửa default thành sudoku
      isLoading: false,
      activeGame: null,
    };
  }

  componentDidMount() {
    console.log("[MiniHub] ComponentDidMount - Current Tab:", this.state.tab);
    if (this.state.tab === 'minigame') {
      this.handleLoadLeaderboard();
    }
  }

  // Xóa hàm bị lặp, gộp lại thành 1 hàm duy nhất và chuẩn nhất
  handleLoadLeaderboard = async () => {
    console.log("[MiniHub] Triggering handleLoadLeaderboard...");
    this.setState({ isLoading: true });
    try {
      if (this.state.tab === 'minigame') {
        const targetGame = this.state.minigameFilter === 'all' ? 'sudoku' : this.state.minigameFilter;
        console.log(`[MiniHub] Gọi API cho gameId: ${targetGame}`);

        // Gọi hàm API đã import
        const response = await handleGetLeaderboardApi(targetGame);
        console.log("[MiniHub] Kết quả API trả về:", response);
      }
    } catch (error) {
      console.error('[MiniHub] Lỗi khi tải bảng xếp hạng:', error);
      toast.error('Lỗi khi tải bảng xếp hạng!');
    } finally {
      this.setState({ isLoading: false });
    }
  };

  // Xóa setMinigameFilter lặp, gộp lại
  setMinigameFilter = (filter) => {
    console.log(`[MiniHub] Thay đổi filter thành: ${filter}`);
    this.setState({ minigameFilter: filter }, () => {
      this.handleLoadLeaderboard();
    });
  };

  // Xóa setTab lặp, gộp lại
  setTab = (tab) => {
    console.log(`[MiniHub] Thay đổi tab thành: ${tab}`);
    this.setState({ tab }, () => {
      if (tab === 'minigame') {
        this.handleLoadLeaderboard();
      }
    });
  };

  handlePlayGame = async (gameId) => {
    if (gameId === 'sudoku') {
      this.setState({ isLoading: true });
      try {
        const response = await handleSyncSudokuLevels();
        console.log("=== DANH SÁCH MÀN CHƠI SUDOKU ===", response);

        if (response && (response.levels || response.success)) {
          this.setState({ activeGame: 'sudoku' });
        }
      } catch (error) {
        console.log('Error loading levels:', error);
        toast.error('Lỗi kết nối khi tải màn chơi!');
      } finally {
        this.setState({ isLoading: false });
      }
    } else if (gameId === 'minesweeper') {
      this.setState({ isLoading: true });
      try {
        const response = await handleSyncMinesweeperLevels();
        console.log("=== DANH SÁCH MÀN CHƠI MINESWEEPER ===", response);

        if (response && (response.levels || response.success)) {
          this.setState({ activeGame: 'minesweeper' });
        }
      } catch (error) {
        console.log('Error loading levels:', error);
        toast.error('Lỗi kết nối khi tải màn chơi!');
      } finally {
        this.setState({ isLoading: false });
      }
    } else {
      this.setState({ activeGame: gameId });
    }
  };

  render() {
    const { tab, minigameFilter, activeGame } = this.state;
    const { leaderboards } = this.props;

    // Console log để check Redux Props khi Render
    const targetGame = minigameFilter === 'all' ? 'sudoku' : minigameFilter;
    const currentBoardData = leaderboards?.[targetGame]?.data || [];
    console.log(`[MiniHub] Render - Data Redux (Game: ${targetGame}):`, currentBoardData);

    if (activeGame === 'sudoku') {
      return (
        <SudokuGame onClose={() => this.setState({ activeGame: null })} />
      );
    }

    if (activeGame === 'minesweeper') {
      return (
        <MinesweeperGame onClose={() => this.setState({ activeGame: null })} />
      );
    }

    return (
      <div className="app-container minigame-hub">
        <h2 className="app-title">🎮 Minigame Hub</h2>
        <ArcadeList onPlayGame={this.handlePlayGame} />

        <LeaderboardView
          minigameFilter={minigameFilter}
          setMinigameFilter={this.setMinigameFilter}
          leaderboardData={currentBoardData}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  minigameHighscores: state.minigame.minigameHighscores,
  leaderboards: state.minigame.leaderboards // Lấy thêm state này
});

export default connect(mapStateToProps, null)(withTranslation()(MinigameHub));

