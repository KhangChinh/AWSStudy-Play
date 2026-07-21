import React from 'react';
import './RankFrame.scss';

const RankFrame = ({ tier = 'none', size = 96, children, className = '' }) => (
  <div
    className={`rank-frame-badge rank-frame-${tier} ${className}`}
    style={{ width: size, '--rf-icon': `${Math.round(size * 0.38)}px` }}
  >
    <div className="rf-window">{children}</div>
  </div>
);

export default RankFrame;