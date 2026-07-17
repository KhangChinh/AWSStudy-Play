import React, { useEffect, useId, useState } from 'react';
import './RankFrame.scss';

const FRAME_STYLE = {
  light: 'var(--rf-light)',
  mid: 'var(--rf-mid)',
  dark: 'var(--rf-dark)',
  glow: 'var(--rf-glow)',
  gem: 'var(--rf-gem)',
  wings: true,
  crown: true,
  deluxe: true,
};

const Wing = ({ side }) => {
  // side = 1 (phải) hoặc -1 (trái)
  const tx = side === 1 ? 174 : 66;
  return (
    <g transform={`translate(${tx}, 150) scale(${side}, 1)`} className="rf-wing">
      <path d="M0,4 q22,-4 40,5 q-17,10 -40,6 z" />
      <path d="M0,-6 q21,-7 37,-2 q-15,10 -37,7 z" />
      <path d="M0,-16 q18,-8 31,-5 q-13,8 -31,7 z" />
      <path d="M0,-26 q14,-7 24,-6 q-11,7 -24,6 z" />
    </g>
  );
};

// Cánh đôi lớn (bản deluxe) – xòe rộng hơn, nhiều lông hơn, nằm sau
const BigWing = ({ side }) => {
  const tx = side === 1 ? 172 : 68;
  return (
    <g transform={`translate(${tx}, 158) scale(${side}, 1)`} className="rf-bigwing">
      <path d="M0,10 q30,-5 52,7 q-23,13 -52,7 z" />
      <path d="M0,-2 q28,-8 48,-2 q-21,13 -48,8 z" />
      <path d="M0,-14 q25,-10 42,-6 q-19,12 -42,9 z" />
      <path d="M0,-26 q21,-10 35,-7 q-16,11 -35,9 z" />
      <path d="M0,-38 q16,-9 27,-7 q-13,9 -27,8 z" />
    </g>
  );
};

const RankFrame = ({ tier = 'none', size = 96, children, className = '', frameAssetUrl = '' }) => {
  const uid = useId().replace(/:/g, '');
  const [isExternalFrameReady, setIsExternalFrameReady] = useState(false);
  const t = FRAME_STYLE;
  const metal = `metal-${uid}`;
  const sheen = `sheen-${uid}`;
  const glow = `glow-${uid}`;

  useEffect(() => {
    setIsExternalFrameReady(false);
  }, [frameAssetUrl]);

  if (tier === 'none') {
    return (
      <div
        className={`rank-frame-badge rank-frame-none ${className}`}
        style={{ width: size, '--rf-icon': `${Math.round(size * 0.38)}px` }}
      >
        <div className="rf-window">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`rank-frame-badge rank-frame-${tier} ${isExternalFrameReady ? 'has-external-art' : ''} ${className}`}
      style={{ width: size, '--rf-icon': `${Math.round(size * 0.38)}px` }}
    >
      <div className="rf-window">
        {children}
      </div>

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

      <svg viewBox="0 0 240 268" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={metal} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.light} />
            <stop offset="45%" stopColor={t.mid} />
            <stop offset="100%" stopColor={t.dark} />
          </linearGradient>
          <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
          </linearGradient>
          <radialGradient id={glow} cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor={t.glow} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* hào quang nền */}
        <rect className="rf-aura" x="20" y="20" width="200" height="220" fill={`url(#${glow})`} />

        {/* vòng hào quang xoay (bản deluxe) */}
        {t.deluxe && (
          <g className="rf-halo">
            <circle cx="120" cy="116" r="90" fill="none" stroke={`url(#${metal})`} strokeWidth="2.5" strokeDasharray="5 12" opacity="0.7" />
            <circle cx="120" cy="116" r="100" fill="none" stroke={t.gem} strokeWidth="1.2" strokeDasharray="2 16" opacity="0.55" />
          </g>
        )}

        {/* cánh hai bên */}
        {t.wings && (
          <g fill={`url(#${metal})`} stroke={t.dark} strokeWidth="1.5" strokeLinejoin="round" opacity="0.95">
            {t.deluxe && (
              <g opacity="0.7">
                <BigWing side={1} />
                <BigWing side={-1} />
              </g>
            )}
            <Wing side={1} />
            <Wing side={-1} />
          </g>
        )}

        {/* ── ĐẾ DƯỚI HÌNH CUỐN SÁCH MỞ ── */}
        <g className="rf-book" transform="translate(19 3) scale(0.84)" display="none">
          {/* bìa sách */}
          <path
            d="M120,250 L66,238 Q60,236 60,229 L60,214 Q60,208 67,210 L120,222 L173,210 Q180,208 180,214 L180,229 Q180,236 174,238 Z"
            fill={`url(#${metal})`}
            stroke={t.dark}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* hai trang giấy */}
          <path d="M120,216 L70,206 Q66,228 70,232 L120,242 Z" fill="#fdfaf0" stroke={t.dark} strokeWidth="1.4" />
          <path d="M120,216 L170,206 Q174,228 170,232 L120,242 Z" fill="#fff8e6" stroke={t.dark} strokeWidth="1.4" />
          {/* dòng kẻ trang */}
          <g stroke={t.dark} strokeWidth="1" opacity="0.45" strokeLinecap="round">
            <line x1="80" y1="214" x2="112" y2="221" />
            <line x1="80" y1="222" x2="112" y2="229" />
            <line x1="128" y1="221" x2="160" y2="214" />
            <line x1="128" y1="229" x2="160" y2="222" />
          </g>
          {/* gáy sách */}
          <line x1="120" y1="216" x2="120" y2="242" stroke={t.dark} strokeWidth="2" />
        </g>

        {/* ── KHUNG VUÔNG ── */}
        <rect x="60" y="56" width="120" height="120" rx="22" fill="none" />
        <rect
          x="60" y="56" width="120" height="120" rx="22"
          fill="none" stroke={`url(#${metal})`} strokeWidth="10"
        />
        <rect
          x="60" y="56" width="120" height="120" rx="22"
          fill="none" stroke={`url(#${sheen})`} strokeWidth="2.5"
        />
        {/* đinh tán 4 góc */}
        {[[60, 56], [180, 56], [60, 176], [180, 176]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="7" fill={`url(#${metal})`} stroke={t.dark} strokeWidth="1.5" />
        ))}

        {/* ── VƯƠNG MIỆN ── */}
        {t.crown !== false && (
          <>
            <g className="rf-crown" fill={`url(#${metal})`} stroke={t.dark} strokeWidth="2" strokeLinejoin="round">
              <path d="M84,52 L84,34 L102,46 L120,22 L138,46 L156,34 L156,52 Z" />
              <rect x="82" y="50" width="76" height="9" rx="3" />
            </g>
            {/* viên ngọc trên miện */}
            <circle cx="120" cy="20" r={t.deluxe ? 7.5 : 6} fill={t.gem} stroke={t.dark} strokeWidth="1.5" />
            <circle cx="102" cy="44" r="3.5" fill={t.gem} />
            <circle cx="138" cy="44" r="3.5" fill={t.gem} />
            {t.deluxe && <circle cx="120" cy="20" r="3" fill="#ffffff" opacity="0.9" />}
          </>
        )}
        {/* ngọc gắn 4 góc khung (deluxe) */}
        {t.deluxe && [[60, 56], [180, 56], [60, 176], [180, 176]].map(([cx, cy], i) => (
          <circle key={`g${i}`} cx={cx} cy={cy} r="3.4" fill={t.gem} />
        ))}

        {/* tia sáng lấp lánh */}
        <g fill="#ffffff" className="rf-spark">
          <path d="M72,70 l2,6 l6,2 l-6,2 l-2,6 l-2,-6 l-6,-2 l6,-2 z" opacity="0.9" />
          <path d="M168,150 l1.5,4.5 l4.5,1.5 l-4.5,1.5 l-1.5,4.5 l-1.5,-4.5 l-4.5,-1.5 l4.5,-1.5 z" opacity="0.8" />
          {t.deluxe && (
            <>
              <path d="M168,72 l1.8,5.4 l5.4,1.8 l-5.4,1.8 l-1.8,5.4 l-1.8,-5.4 l-5.4,-1.8 l5.4,-1.8 z" opacity="0.85" />
              <path d="M120,196 l1.6,4.8 l4.8,1.6 l-4.8,1.6 l-1.6,4.8 l-1.6,-4.8 l-4.8,-1.6 l4.8,-1.6 z" opacity="0.8" />
            </>
          )}
        </g>

      </svg>

    </div>
  );
};

export default RankFrame;
