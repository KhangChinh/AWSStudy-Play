import React from 'react';
import { IonIcon } from '@ionic/react';
import { 
  trophyOutline, giftOutline, starOutline, 
  flameOutline, checkmarkCircleOutline, timerOutline
} from 'ionicons/icons';
import './QuestWidget.scss';

const QUEST_ICONS = {
  FOCUS: flameOutline,
  PLAY_SUDOKU: starOutline,
  PLAY_MINESWEEPER: starOutline,
  GACHA: giftOutline,
  COMPLETE_DAILY: trophyOutline,
};

const QuestWidget = ({ 
  quests = [], 
  allDaily = null,
  expiresAt = 0,
  isCollapsed, 
  onToggle, 
  onClaimAll, 
  onClaimQuest, 
  t 
}) => {
  const completedCount = quests.filter(q => q.isCompleted).length;
  const totalCount = quests.length;
  const isAllCompleted = quests.length > 0 && completedCount === quests.length;

  // Format time
  const formatTime = (ts) => {
    if (!ts) return "--:--";
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`quest-widget ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="widget-header">
        <div className="title" onClick={onToggle}>
          <IonIcon icon={trophyOutline} />
          <span>{t('quest.daily_quests')}</span>
        </div>
        <div className="header-controls">
          {isCollapsed && completedCount > 0 ? (
            <span className="count-badge" onClick={onToggle}>{completedCount}</span>
          ) : (
            <span className="count-text" onClick={onToggle}>{completedCount}/{totalCount}</span>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="widget-meta">
            <span className="expires-at">
              <IonIcon icon={timerOutline} /> {t('quest.expires_at')}: {formatTime(expiresAt)}
            </span>
          </div>

          <div className="quest-mini-list">
            {quests.length > 0 ? (
              quests.sort((a, b) => (a.target || 0) - (b.target || 0)).map(q => {
                const isDone = q.isCompleted;
                const isClaimed = q.isClaimed;
                const icon = QUEST_ICONS[q.type] || starOutline;
                
                return (
                  <div key={q.id} className={`mini-item ${isDone ? 'done' : ''} ${isClaimed ? 'claimed' : ''}`} title={q.description}>
                    <div className="quest-mini-icon">
                      <IonIcon icon={isClaimed ? checkmarkCircleOutline : icon} />
                    </div>
                    <div className="quest-mini-info">
                      <div className="name-row">
                        <span className="name">{q.title}</span>
                        <span className="reward">+{q.reward} KP</span>
                      </div>
                      <span className="desc">{q.description}</span>
                    </div>
                    {!isClaimed && (
                      isDone ? (
                        <button className="btn-mini-claim" onClick={() => onClaimQuest(q.id)}>
                          <IonIcon icon={giftOutline} />
                        </button>
                      ) : (
                        <span className="prog">{q.status}</span>
                      )
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-quests-mini">
                <span>{t('quest.empty')}</span>
              </div>
            )}
          </div>

          {/* All Daily Bonus */}
          {allDaily && (
            <div className={`all-daily-mini ${allDaily.isCompleted ? 'ready' : ''} ${allDaily.isClaimed ? 'claimed' : ''}`}>
              <div className="all-daily-info">
                <span className="bonus-label">{allDaily.name}</span>
                <span className="bonus-reward">+{allDaily.reward} KP</span>
              </div>
              <div className="all-daily-progress">
                <div 
                   className="progress-fill" 
                   style={{ width: `${Math.min(100, (allDaily.progress / allDaily.target) * 100)}%` }} 
                />
              </div>
              {allDaily.isCompleted && !allDaily.isClaimed && (
                <button className="btn-claim-all" onClick={onClaimAll}>
                  <IonIcon icon={giftOutline} /> {t('missions.claim')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestWidget;
