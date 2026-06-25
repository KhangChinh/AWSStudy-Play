import React from 'react';
import { IonIcon } from '@ionic/react';
import { flagOutline, giftOutline } from 'ionicons/icons';
import './MissionsWidget.scss';

const MissionsWidget = ({ missions = [], isCollapsed, onToggle, onClaimAll, onClaimMission, t }) => {
  const completedCount = missions.filter(m => m.isCompleted || (() => {
    const [curr, total] = String(m.status || '0/1').split('/').map(Number);
    return curr >= total;
  })()).length;
  const claimableCount = missions.filter(m => m.isCompleted && !m.isClaimed).length;
  const isAllCompleted = missions.length > 0 && completedCount === missions.length;

  return (
    <div className={`missions-widget ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="widget-header" onClick={onToggle}>
        <div className="title">
          <IonIcon icon={flagOutline} />
          <span>{t('dashboard.missions')}</span>
        </div>
        {isCollapsed && claimableCount > 0 ? (
          <button className="btn-mini-claim-all" onClick={(e) => { e.stopPropagation(); onClaimAll(); }}>
            {t('missions.claim_all')}
          </button>
        ) : (
          <span className="count">{completedCount}/{missions.length}</span>
        )}
      </div>
      {!isCollapsed && (
        <>
          <div className="mission-mini-list">
            {missions.map(m => {
              const [curr, total] = String(m.status || '0/1').split('/').map(Number);
              const isDone = m.isCompleted || curr >= total;
              const isClaimed = !!m.isClaimed;
              return (
                <div key={m.id} className={`mini-item ${isDone ? 'done' : ''} ${isClaimed ? 'claimed' : ''}`}>
                  <div className="indicator-dot" />
                  <span className="name">{m.title}</span>
                  {isClaimed ? (
                    <span className="prog">Claimed</span>
                  ) : (
                    isDone ? (
                      <button className="btn-mini-claim" onClick={() => onClaimMission(m.questKey || m.id)}>
                        {t('missions.claim')}
                      </button>
                    ) : (
                      <span className="prog">{m.status}</span>
                    )
                  )}
                </div>
              );
            })}
          </div>
          {isAllCompleted && claimableCount > 0 && (
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
