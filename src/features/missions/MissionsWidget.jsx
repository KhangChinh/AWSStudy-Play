import React from 'react';
import { IonIcon } from '@ionic/react';
import { flagOutline, giftOutline } from 'ionicons/icons';
import './MissionsWidget.scss';

const MissionsWidget = ({ missions, onClaimAll }) => {
  const completedCount = missions.filter(m => {
    const [curr, total] = m.status.split('/').map(Number);
    return curr >= total;
  }).length;
  const isAllCompleted = completedCount === missions.length;

  return (
    <div className="missions-widget">
      <div className="widget-header">
        <div className="title">
          <IonIcon icon={flagOutline} />
          <span>Missions</span>
        </div>
        <span className="count">{completedCount}/{missions.length}</span>
      </div>
      <div className="mission-mini-list">
        {missions.map(m => {
          const [curr, total] = m.status.split('/').map(Number);
          const isDone = curr >= total;
          return (
            <div key={m.id} className={`mini-item ${isDone ? 'done' : ''}`}>
              <div className="indicator-dot" />
              <span className="name">{m.title}</span>
              <span className="prog">{m.status}</span>
            </div>
          );
        })}
      </div>
      {isAllCompleted && (
        <button className="btn-claim-all" onClick={onClaimAll}>
          <IonIcon icon={giftOutline} /> Claim All Rewards
        </button>
      )}
    </div>
  );
};

export default MissionsWidget;
