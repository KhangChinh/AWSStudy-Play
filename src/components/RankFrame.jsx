import React, { useId } from 'react';
import './RankFrame.scss';

/**
 * Khung avatar theo hạng (Bronze → Diamond).
 * Dựng hoàn toàn bằng SVG: vương miện trên đỉnh, cánh hai bên,
 * khung vuông kim loại, đế dưới hình cuốn sách mở.
 */
const TIERS = {
  // Khung theo tên gốc
  none: {
    light: '#eef2f7', mid: '#94a3b8', dark: '#475569',
    glow: 'rgba(148, 163, 184, 0.4)', gem: '#e2e8f0', wings: false, crown: false,
  },
  neon: {
    light: '#f5d0fe', mid: '#d946ef', dark: '#86198f',
    glow: 'rgba(217, 70, 239, 0.6)', gem: '#f0abfc', wings: false,
  },
  gold: {
    light: '#fff5c2', mid: '#f7c33a', dark: '#a9760f',
    glow: 'rgba(251, 191, 36, 0.55)', gem: '#fff7d6', wings: true,
  },
  galactic: {
    light: '#c7d2fe', mid: '#6366f1', dark: '#1e1b4b',
    glow: 'rgba(99, 102, 241, 0.65)', gem: '#67e8f9', wings: true, deluxe: true,
  },
};

const Wing = ({ side }) => {
  // side = 1 (phải) hoặc -1 (trái)
  const tx = side === 1 ? 178 : 62;
  return (
    <g transform={`translate(${tx}, 150) scale(${side}, 1)`} className="rf-wing">
      <path d="M0,4 q30,-4 52,6 q-22,12 -52,6 z" />
      <path d="M0,-6 q28,-8 48,-2 q-20,12 -48,8 z" />
      <path d="M0,-16 q24,-10 40,-6 q-18,11 -40,8 z" />
      <path d="M0,-26 q19,-9 31,-7 q-15,9 -31,7 z" />
    </g>
  );
};

// Cánh đôi lớn (bản deluxe) – xòe rộng hơn, nhiều lông hơn, nằm sau
const BigWing = ({ side }) => {
  const tx = side === 1 ? 176 : 64;
  return (
    <g transform={`translate(${tx}, 158) scale(${side}, 1)`} className="rf-bigwing">
      <path d="M0,10 q40,-6 70,8 q-30,16 -70,8 z" />
      <path d="M0,-2 q38,-10 64,-2 q-28,16 -64,10 z" />
      <path d="M0,-14 q34,-12 56,-7 q-26,15 -56,11 z" />
      <path d="M0,-26 q28,-13 46,-9 q-22,14 -46,11 z" />
      <path d="M0,-38 q22,-12 36,-9 q-18,12 -36,10 z" />
    </g>
  );
};

const RankFrame = ({ tier = 'none', size = 96, children, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const t = TIERS[tier] || TIERS.none;
  const metal = `metal-${uid}`;
  const sheen = `sheen-${uid}`;
  const glow = `glow-${uid}`;

  return (
    <div
      className={`rank-frame-badge rank-frame-${tier} ${className}`}
      style={{ width: size, '--rf-glow': t.glow, '--rf-icon': `${Math.round(size * 0.38)}px` }}
    >
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
        <g className="rf-book">
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
        <rect x="60" y="56" width="120" height="120" rx="22" fill="rgba(8,12,28,0.55)" />
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

      <div className="rf-window">
        {children}
      </div>
    </div>
  );
};

export default RankFrame;
