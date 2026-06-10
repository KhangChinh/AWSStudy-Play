import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { playOutline, trophyOutline, timeOutline, gameControllerOutline } from 'ionicons/icons';

import './MinigameHub.scss';
import { setHighscores } from '../../store/actions';
import { handleGetLeaderboardApi } from '../../services/socialServices';
import { toast } from 'react-toastify';
import SudokuGame from './SudokuGame';

const MINIGAMES = [
  { id: 'all', label: 'Tổng Wins', icon: '🏅' },
  { id: 'minesweeper', label: 'Minesweeper', icon: '💣' },
  { id: 'sudoku', label: 'Sudoku', icon: '🔢' },
];

const MINIGAME_SCORES = {
  all:         [500, 425, 350, 275, 200],
  minesweeper: [180, 155, 120, 90, 60],
  sudoku:      [130, 110, 90, 75, 50],
};

// ═══ Arcade Game List ═══
const ArcadeList = ({ onPlayGame, t }) => (
  <div className="arcade-list">
    <h3><IonIcon icon={gameControllerOutline} /> {t('minigames.arcade')}</h3>
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
              <IonIcon icon={playOutline} /> {game.disabled ? t('minigames.coming_soon') : t('minigames.play_now')}
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ═══ Leaderboard (Stateless Functional Component for UI rendering) ═══
const LeaderboardView = ({ tab, minigameFilter, setTab, setMinigameFilter, t }) => {
  const scores = tab === 'study'
    ? [120.5, 98.2, 85.0, 72.4, 60.1]
    : MINIGAME_SCORES[minigameFilter];

  const scoreLabel = tab === 'study'
    ? (v) => `${v.toFixed(1)}h`
    : (v) => `${v} ${t('minigames.wins')}`;

  const DEMO_PLAYERS = [
    { name: 'Cosmic_King', avatar: '👑' },
    { name: 'Nebula_Runner', avatar: '✨' },
    { name: 'Star_Gazer', avatar: '🔭' },
    { name: 'Void_Walker', avatar: '🌌' },
    { name: 'Galaxy_Master', avatar: '🌠' }
  ];

  return (
    <div className="leaderboard-section">
      <div className="section-header">
        <h3><IonIcon icon={trophyOutline} /> {t('minigames.hall_of_fame')}</h3>
        <div className="tabs">
          <button className={tab === 'study' ? 'active' : ''} onClick={() => setTab('study')}>
            <IonIcon icon={timeOutline} /> {t('minigames.study')}
          </button>
          <button className={tab === 'minigame' ? 'active' : ''} onClick={() => setTab('minigame')}>
            <IonIcon icon={gameControllerOutline} /> {t('minigames.minigame')}
          </button>
        </div>
      </div>

      {tab === 'minigame' && (
        <div className="minigame-filter">
          <select
            className="minigame-select"
            value={minigameFilter}
            onChange={e => setMinigameFilter(e.target.value)}
          >
            {MINIGAMES.map(g => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.id === 'all' ? t('minigames.total_wins') : g.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rank-list">
        {DEMO_PLAYERS.map((player, i) => (
          <div className={`rank-item ${i < 3 ? `top-${i + 1}` : ''}`} key={i}>
            <div className="rank-number">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>
            <div className="player-info">
              <div className="player-avatar">{player.avatar}</div>
              <div className="player-details">
                <div className="name-with-title">
                  <span className="player-name">{player.name}</span>
                  <span className="player-title" style={{ color: i === 0 ? '#a855f7' : i < 3 ? '#f87171' : '#94a3b8' }}>
                    [{i === 0 ? 'Đại Gia' : i < 3 ? 'Chiến Thần' : 'Tân Thủ'}]
                  </span>
                </div>
                <span className="player-rank-title">{i === 0 ? 'Grandmaster' : i < 3 ? 'Elite' : 'Challenger'}</span>
              </div>
            </div>
            <div className="score-badge">
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
        <h2 className="app-title">🎮 {this.props.t('minigames.title')}</h2>
        <ArcadeList onPlayGame={(game) => this.setState({ activeGame: game })} t={this.props.t} />
        <LeaderboardView 
          tab={tab} 
          minigameFilter={minigameFilter}
          setTab={this.setTab}
          setMinigameFilter={this.setMinigameFilter}
          t={this.props.t}
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
