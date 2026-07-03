import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { playOutline, trophyOutline, timeOutline, gameControllerOutline } from 'ionicons/icons';

import './MinigameHub.scss';
import { handleGetLeaderboardApi } from '../../services/socialServices';
import { toast } from 'react-toastify';
import SudokuGame from './games/sudoku/SudokuGame.jsx';

const MINIGAMES = [
  { id: 'all', labelKey: 'minigames.total_wins', icon: '\u{1F3C5}' },
  { id: 'minesweeper', labelKey: 'minigames.games.minesweeper', icon: '\u{1F4A3}' },
  { id: 'sudoku', labelKey: 'minigames.games.sudoku', icon: '\u{1F522}' },
];

const ARCADE_GAMES = [
  { id: 'minesweeper', nameKey: 'minigames.games.minesweeper', price: 100, icon: '\u{1F4A3}', disabled: true },
  { id: 'sudoku', nameKey: 'minigames.games.sudoku', price: 'free', icon: '\u{1F522}', disabled: false },
];

const MINIGAME_SCORES = {
  all: [500, 425, 350, 275, 200],
  minesweeper: [180, 155, 120, 90, 60],
  sudoku: [130, 110, 90, 75, 50],
};

const ArcadeList = ({ onPlayGame, t }) => (
  <div className="arcade-list">
    <h3><IonIcon icon={gameControllerOutline} /> {t('minigames.arcade')}</h3>
    <div className="store-grid">
      {ARCADE_GAMES.map(game => (
        <div className="store-item" key={game.id}>
          <div className="item-cover">{game.icon}</div>
          <div className="item-info">
            <span className="item-title">{t(game.nameKey)}</span>
            <span className="item-price">
              {typeof game.price === 'number' ? `${game.price} ${t('minigames.pcoin_play')}` : t('minigames.free')}
            </span>
            <button
              onClick={() => !game.disabled && onPlayGame(game.id)}
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

const LeaderboardView = ({ tab, minigameFilter, setTab, setMinigameFilter, t }) => {
  const scores = tab === 'study'
    ? [120.5, 98.2, 85.0, 72.4, 60.1]
    : MINIGAME_SCORES[minigameFilter];

  const scoreLabel = tab === 'study'
    ? (v) => t('minigames.study_hours', { hours: v.toFixed(1) })
    : (v) => t('minigames.win_count', { count: v });

  const players = [
    { name: 'Cosmic_King', avatar: '\u{1F451}' },
    { name: 'Nebula_Runner', avatar: '\u2728' },
    { name: 'Star_Gazer', avatar: '\u{1F52D}' },
    { name: 'Void_Walker', avatar: '\u{1F30C}' },
    { name: 'Galaxy_Master', avatar: '\u{1F320}' },
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
              <option key={g.id} value={g.id}>{g.icon} {t(g.labelKey)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rank-list">
        {players.map((player, i) => (
          <div className={`rank-item ${i < 3 ? `top-${i + 1}` : ''}`} key={player.name}>
            <div className="rank-number">
              {i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `#${i + 1}`}
            </div>
            <div className="player-info">
              <div className="player-avatar">{player.avatar}</div>
              <div className="player-details">
                <div className="name-with-title">
                  <span className="player-name">{player.name}</span>
                  <span className="player-title" style={{ color: i === 0 ? '#a855f7' : i < 3 ? '#f87171' : '#94a3b8' }}>
                    [{i === 0 ? t('minigames.rank_titles.whale') : i < 3 ? t('minigames.rank_titles.warrior') : t('minigames.rank_titles.newbie')}]
                  </span>
                </div>
                <span className="player-rank-title">{i === 0 ? t('minigames.grandmaster') : i < 3 ? t('minigames.elite') : t('minigames.challenger')}</span>
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

  handleLoadLeaderboard = async () => {
    this.setState({ isLoading: true });
    try {
      const response = await handleGetLeaderboardApi(this.state.minigameFilter);
      if (response && response.errCode === 0) {
        // Leaderboard data can be stored in Redux when backend data is ready.
      }
    } catch (error) {
      console.log('Error loading leaderboard:', error);
      toast.error(this.props.t('minigames.leaderboard_load_error'));
    }
    this.setState({ isLoading: false });
  };

  setTab = (tab) => {
    this.setState({ tab });
  };

  setMinigameFilter = (filter) => {
    this.setState({ minigameFilter: filter }, () => {
      // this.handleLoadLeaderboard();
    });
  };

  render() {
    const { tab, minigameFilter, activeGame } = this.state;
    const { t } = this.props;

    if (activeGame === 'sudoku') {
      return (
        <SudokuGame onClose={() => this.setState({ activeGame: null })} />
      );
    }

    return (
      <div className="app-container minigame-hub">
        <h2 className="app-title"><IonIcon icon={gameControllerOutline} /> {t('minigames.title')}</h2>
        <ArcadeList t={t} onPlayGame={(game) => this.setState({ activeGame: game })} />
        <LeaderboardView
          t={t}
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
  minigameHighscores: state.minigame.minigameHighscores,
});

export default connect(mapStateToProps, null)(withTranslation()(MinigameHub));
