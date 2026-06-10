import React from 'react';
import { IonIcon } from '@ionic/react';
import { flagOutline, giftOutline } from 'ionicons/icons';
import './MissionsWidget.scss';

const MissionsWidget = ({ missions, isCollapsed, onToggle, onClaimAll, onClaimMission, t }) => {
  const completedCount = missions.filter(m => {
    const [curr, total] = m.status.split('/').map(Number);
    return curr >= total;
  }).length;
  const isAllCompleted = completedCount === missions.length;

  return (
    <div className={`missions-widget ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="widget-header" onClick={onToggle}>
        <div className="title">
          <IonIcon icon={flagOutline} />
          <span>{t('dashboard.missions')}</span>
        </div>
        {isCollapsed && isAllCompleted ? (
          <button className="btn-mini-claim-all" onClick={(e) => { e.stopPropagation(); onClaimAll(); }}>{t('common.rename') === 'Rename' ? 'Claim All' : 'Nhận hết'}</button>
        ) : (
          <span className="count">{completedCount}/{missions.length}</span>
        )}
      </div>
      {!isCollapsed && (
        <>
          <div className="mission-mini-list">
            {missions.map(m => {
              const [curr, total] = m.status.split('/').map(Number);
              const isDone = curr >= total;
              return (
                <div key={m.id} className={`mini-item ${isDone ? 'done' : ''}`}>
                  <div className="indicator-dot" />
                  <span className="name">{m.title}</span>
                  {!isAllCompleted && (
                    isDone ? (
                      <button className="btn-mini-claim" onClick={() => onClaimMission(m.id)}>{t('common.rename') === 'Rename' ? 'Claim' : 'Nhận'}</button>
                    ) : (
                      <span className="prog">{m.status}</span>
                    )
                  )}
                </div>
              );
            })}
          </div>
          {isAllCompleted && (
            <button className="btn-claim-all" onClick={onClaimAll}>
              <IonIcon icon={giftOutline} /> {t('missions.claim_all')}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default MissionsWidget;
