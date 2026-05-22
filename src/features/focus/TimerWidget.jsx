import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { stopCircleOutline, playOutline, pauseOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import './TimerWidget.scss';

const TimerWidget = () => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    if (window.api) {
      await window.api.invoke('focus:stop');
    }
  };

  return (
    <div className="timer-widget-wrapper">
      <div className="timer-widget-container">
        <div className="drag-area"></div>
        
        {/* Decorative Ring */}
        <div className="progress-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="bg" />
            <circle cx="50" cy="50" r="45" className={`fg ${isActive ? 'animating' : ''}`} />
          </svg>
          <div className="inner-icon">
             <IonIcon icon={shieldCheckmarkOutline} />
          </div>
        </div>

        <div className="timer-info">
          <div className="status-badge">
            <span className="dot"></span>
            {isActive ? 'DEEP FOCUS' : 'PAUSED'}
          </div>
          <span className="time-value">{formatTime(seconds)}</span>
        </div>

        <div className="action-buttons">
          <button onClick={() => setIsActive(!isActive)} className={`btn-action btn-toggle ${!isActive ? 'is-paused' : ''}`}>
            <IonIcon icon={isActive ? pauseOutline : playOutline} />
          </button>
          <button onClick={handleStop} className="btn-action btn-stop">
            <IonIcon icon={stopCircleOutline} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerWidget;
