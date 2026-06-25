import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { gameControllerOutline, playOutline, refreshOutline, timeOutline, trophyOutline } from 'ionicons/icons';
import { setHighscores } from '../../store/actions';
import { handleGetMinigameLeaderboardApi, handleGetMinigameLevelsApi } from '../../services/minigameServices';
import SudokuGame from '../../../public/games/sudoku/SudokuGame';
import './MinigameHub.scss';

const GAMES = [
  { id: 'sudoku', label: 'Sudoku', icon: 'S', disabled: false },
  { id: 'minesweeper', label: 'Minesweeper', icon: 'M', disabled: true },
];

class MinigameHub extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: 'minigame',
      gameId: 'sudoku',
      leaderboardScope: 'global',
      levels: [],
      leaderboard: [],
      isLoading: false,
      activeGame: null,
    };
  }

  componentDidMount() {
    this.loadCloudData();
  }

  loadCloudData = async () => {
    const { gameId, leaderboardScope } = this.state;
    this.setState({ isLoading: true });
    try {
      const [levelsResponse, leaderboardResponse] = await Promise.all([
        handleGetMinigameLevelsApi(gameId),
        handleGetMinigameLeaderboardApi(gameId, leaderboardScope),
      ]);

      if (levelsResponse?.success) {
        this.setState({ levels: levelsResponse.levels || [] });
      }

      if (leaderboardResponse?.success) {
        const leaderboard = leaderboardResponse.leaderboard || [];
        this.setState({ leaderboard });
        this.props.setHighscores({ [gameId]: leaderboard });
      }
    } catch (error) {
      toast.error(error.message || 'Cannot load minigame data');
    } finally {
      this.setState({ isLoading: false });
    }
  };

  setGame = (gameId) => {
    this.setState({ gameId }, this.loadCloudData);
  };

  setLeaderboardScope = (leaderboardScope) => {
    this.setState({ leaderboardScope }, this.loadCloudData);
  };

  renderArcadeList = () => (
    <div className="arcade-list">
      <h3><IonIcon icon={gameControllerOutline} /> {this.props.t('minigames.arcade')}</h3>
      <div className="store-grid">
        {GAMES.map(game => (
          <div className={`store-item ${game.disabled ? 'coming-soon' : ''}`} key={game.id}>
            <div className="item-cover">{game.icon}</div>
            <div className="item-info">
              <span className="item-title">{game.label}</span>
              <span className="item-price">{game.disabled ? this.props.t('minigames.coming_soon') : this.props.t('minigames.free')}</span>
              <button
                onClick={() => !game.disabled && this.setState({ activeGame: game.id })}
                disabled={game.disabled}
              >
                <IonIcon icon={playOutline} /> {game.disabled ? this.props.t('minigames.coming_soon') : this.props.t('minigames.play_now')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  renderLevels = () => (
    <div className="leaderboard-section">
      <div className="section-header">
        <h3><IonIcon icon={timeOutline} /> Levels</h3>
        <button className="minigame-refresh-btn" onClick={this.loadCloudData} disabled={this.state.isLoading}>
          <IonIcon icon={refreshOutline} />
        </button>
      </div>
      <div className="rank-list">
        {this.state.levels.length === 0 ? (
          <div className="rank-item">
            <span className="player-rank-title">{this.state.isLoading ? 'Loading...' : 'No levels found'}</span>
          </div>
        ) : this.state.levels.map(level => (
          <div className="rank-item" key={level.SK}>
            <div className="rank-number">{level.SK}</div>
            <div className="player-info">
              <div className="player-details">
                <div className="player-name">{level.name || level.SK}</div>
                <span className="player-rank-title">Sanity {level.sanityCost || 0}</span>
              </div>
            </div>
            <div className="score-badge">{level.score?.personalBest || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );

  renderLeaderboard = () => (
    <div className="leaderboard-section">
      <div className="section-header">
        <h3><IonIcon icon={trophyOutline} /> {this.props.t('minigames.hall_of_fame')}</h3>
        <div className="tabs">
          <button className={this.state.leaderboardScope === 'global' ? 'active' : ''} onClick={() => this.setLeaderboardScope('global')}>
            Global
          </button>
          <button className={this.state.leaderboardScope === 'friends' ? 'active' : ''} onClick={() => this.setLeaderboardScope('friends')}>
            Friends
          </button>
        </div>
      </div>

      <div className="minigame-filter">
        <select className="minigame-select" value={this.state.gameId} onChange={e => this.setGame(e.target.value)}>
          {GAMES.map(game => (
            <option key={game.id} value={game.id}>{game.label}</option>
          ))}
        </select>
      </div>

      <div className="rank-list">
        {this.state.leaderboard.length === 0 ? (
          <div className="rank-item">
            <span className="player-rank-title">{this.state.isLoading ? 'Loading...' : 'No leaderboard data'}</span>
          </div>
        ) : this.state.leaderboard.map((entry, index) => (
          <div className={`rank-item ${index < 3 ? `top-${index + 1}` : ''}`} key={entry.userId || index}>
            <div className="rank-number">#{entry.rank || index + 1}</div>
            <div className="player-info">
              <div className="player-avatar">{entry.displayInfo?.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
              <div className="player-details">
                <div className="player-name">{entry.displayInfo?.name || entry.userId}</div>
                <span className="player-rank-title">{entry.levelsCompleted || 0} levels</span>
              </div>
            </div>
            <div className="score-badge">{entry.totalScore || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );

  render() {
    if (this.state.activeGame === 'sudoku') {
      return <SudokuGame onClose={() => this.setState({ activeGame: null })} />;
    }

    return (
      <div className="app-container minigame-hub">
        <h2 className="app-title"><IonIcon icon={gameControllerOutline} /> {this.props.t('minigames.title')}</h2>
        {this.renderArcadeList()}
        {this.renderLevels()}
        {this.renderLeaderboard()}
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
