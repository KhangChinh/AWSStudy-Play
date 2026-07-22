import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { gameControllerOutline, playOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { handleGetLeaderboardApi } from '../../services/minigameServices';
import UserAvatar from '../../components/UserAvatar';
import './MinigameWidget.scss';

const MinigameWidget = ({ onOpenMinigame }) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const leaderboards = useSelector(state => state.minigame?.leaderboards);

  const games = [
    { id: 'sudoku', name: 'Sudoku', desc: 'Trí tuệ', price: 'Free', icon: '🧠', disabled: false },
    { id: 'minesweeper', name: 'Minesweeper', desc: 'Dò mìn', price: '100 🪙', icon: '💣', disabled: false },
  ];

  useEffect(() => {
    games.forEach(game => {
      if (!game.disabled) {
        handleGetLeaderboardApi(game.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = (gameId) => {
    localStorage.setItem('targetMinigame', gameId);
    if (onOpenMinigame) onOpenMinigame();
  };

  return (
    <div className={`minigame-widget-container ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="mw-header">
        <span className="mw-header-title"><IonIcon icon={gameControllerOutline} /><h4>{t('dashboard.minigames', 'Arcade')}</h4></span>
        <button
          type="button"
          className="mw-toggle"
          onClick={() => setIsCollapsed(collapsed => !collapsed)}
          aria-label={isCollapsed ? 'Expand Arcade' : 'Collapse Arcade'}
          aria-expanded={!isCollapsed}
        >
          <IonIcon icon={isCollapsed ? chevronForwardOutline : chevronBackOutline} aria-hidden="true" />
        </button>
      </div>
      <div className="mw-list" aria-hidden={isCollapsed}>
        {games.map(game => {
          const lbData = leaderboards?.[game.id]?.data || [];
          const top3 = lbData.slice(0, 3);
          
          return (
            <div className="mw-item-wrapper" key={game.id}>
              <div className="mw-item" onClick={() => !game.disabled && handlePlay(game.id)}>
                <div className="mw-icon">{game.icon}</div>
                <div className="mw-info">
                  <span className="mw-name">{game.name}</span>
                  <span className="mw-desc">{game.desc}</span>
                </div>
                <div className="mw-action">
                  <span className="mw-price">{game.price}</span>
                  <button 
                    className={`mw-play-btn ` + (game.disabled ? 'disabled' : '')}
                    disabled={game.disabled}
                    onClick={(e) => { e.stopPropagation(); handlePlay(game.id); }}
                  >
                    <IonIcon icon={playOutline} />
                  </button>
                </div>
              </div>
              
              {!game.disabled && top3.length > 0 && (
                <div className="mw-leaderboard">
                  {top3.map((player, idx) => (
                    <div className="mw-lb-row" key={idx}>
                      <span className={`mw-lb-rank rank-` + (idx + 1)}>
                         {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <div className="mw-lb-user">
                        <UserAvatar
                          avatarUrl={player.displayInfo?.avatarUrl}
                          alt={player.displayInfo?.name || 'avatar'}
                        />
                        <span className="mw-lb-name">{player.displayInfo?.name || 'Ẩn danh'}</span>
                      </div>
                      <span className="mw-lb-score">{player.totalScore?.toLocaleString() || 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MinigameWidget;
