import React, { useEffect, useState } from 'react';
import './RankFrame.scss';

const RankFrame = ({ tier = 'none', size = 96, children, className = '', frameAssetUrl = '' }) => {
  const [isExternalFrameReady, setIsExternalFrameReady] = useState(false);

  useEffect(() => {
    setIsExternalFrameReady(false);
  }, [frameAssetUrl]);

  return (
    <div
      className={`rank-frame-badge rank-frame-${tier} ${isExternalFrameReady ? 'has-external-art' : ''} ${className}`}
      style={{ width: size, '--rf-icon': `${Math.round(size * 0.38)}px` }}
    >
      <div className="rf-window">{children}</div>
      {frameAssetUrl && (
        <img
          className="rf-external-art"
          src={frameAssetUrl}
          alt=""
          aria-hidden="true"
          draggable="false"
          onLoad={() => setIsExternalFrameReady(true)}
          onError={() => setIsExternalFrameReady(false)}
        />
      )}
    </div>
  );
};

export default RankFrame;