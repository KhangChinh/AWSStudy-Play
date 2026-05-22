import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { playOutline, trophyOutline, timeOutline, gameControllerOutline } from 'ionicons/icons';

import './MinigameHub.scss';
import { setHighscores } from '../../store/actions';
import { handleGetLeaderboardApi } from '../../services/socialServices';
import { toast } from 'react-toastify';
import SudokuGame from '../../../public/games/sudoku/SudokuGame';

const MINIGAMES = [
  { id: 'all', label: 'Tổng Wins', icon: '🏅' },
  { id: 'minesweeper', label: 'Minesweeper', icon: '💣' },
  { id: 'sudoku', label: 'Sudoku', icon: '🔢' },
];

const MINIGAME_SCORES = {
  all: [500, 425, 350, 275, 200],
  minesweeper: [180, 155, 120, 90, 60],
  sudoku: [130, 110, 90, 75, 50],
};

// ═══ Arcade Game List ═══
const ArcadeList = ({ onPlayGame }) => (
  <div className="arcade-list">
    <h3><IonIcon icon={gameControllerOutline} /> Available Games</h3>
    <div className="store-grid">
      {[
        { name: 'Minesweeper', price: 100, icon: '💣', disabled: true },
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

// ═══ Leaderboard (Stateless Functional Component for UI rendering) ═══
const LeaderboardView = ({ tab, minigameFilter, setTab, setMinigameFilter }) => {
  const scores = tab === 'study'
    ? [100, 85, 70, 55, 40]
    : MINIGAME_SCORES[minigameFilter];

  const scoreLabel = tab === 'study'
    ? (v) => `${v}h`
    : (v) => `${v} Wins`;

  return (
    <div className="leaderboard-section">
      <h3><IonIcon icon={trophyOutline} /> Leaderboard</h3>
      <div className="tabs">
        <button className={tab === 'study' ? 'active' : ''} onClick={() => setTab('study')}>
          <IonIcon icon={timeOutline} /> Study Hours
        </button>
        <button className={tab === 'minigame' ? 'active' : ''} onClick={() => setTab('minigame')}>
          <IonIcon icon={gameControllerOutline} /> Minigame Wins
        </button>
      </div>

      {tab === 'minigame' && (
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
      )}

      <div className="rank-list">
        {[...Array(5)].map((_, i) => (
          <div className={`rank-item ${i < 3 ? `top-${i + 1}` : ''}`} key={i}>
            <div className="player">
              <span style={{ fontSize: 20, width: 30 }}>
                {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
              <span>Player_{Math.floor(Math.random() * 9999)}</span>
            </div>
            <div className="score">
              {scoreLabel(scores[i])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// ═══ Main MinigameHub ═══
class MinigameHub extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'study',
      minigameFilter: 'all',
      isLoading: false,
      activeGame: null,
    };
  }

  //load data
  handleLoadLeaderboard = async () => {
    this.setState({ isLoading: true });
    try {
      const response = await handleGetLeaderboardApi(this.state.minigameFilter);
      if (response && response.errCode === 0) {
        // Lưu leaderboard vào redux nếu cần
      }
    } catch (error) {
      console.log('Error loading leaderboard:', error);
      toast.error('Lỗi khi tải bảng xếp hạng!');
    }
    this.setState({ isLoading: false });
  };

  //state update
  setTab = (tab) => {
    this.setState({ tab });
  };

  setMinigameFilter = (filter) => {
    this.setState({ minigameFilter: filter }, () => {
      // this.handleLoadLeaderboard(); // TODO: Uncomment when backend ready
    });
  };

  render() {
    const { tab, minigameFilter, activeGame } = this.state;

    if (activeGame === 'sudoku') {
      return (
        <SudokuGame onClose={() => this.setState({ activeGame: null })} />
      );
    }

    return (
      <div className="app-container minigame-hub">
        <h2 className="app-title">🎮 Minigame Hub</h2>
        <ArcadeList onPlayGame={(game) => this.setState({ activeGame: game })} />
        <LeaderboardView
          tab={tab}
          minigameFilter={minigameFilter}
          setTab={this.setTab}
          setMinigameFilter={this.setMinigameFilter}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  minigameHighscores: state.minigameHighscores,
});

const mapDispatchToProps = (dispatch) => ({
  setHighscores: (data) => dispatch(setHighscores(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(MinigameHub);
