import React from 'react';
import './RankBadge.scss';

/**
 * RankBadge Component — Render huy hiệu Rank 3D cực kỳ tinh xảo bằng SVG chất lượng cao.
 * @param {string} tier - 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master'
 * @param {number} size - Kích thước (pixel) của badge (default: 64)
 */
const RankBadge = ({ tier = 'bronze', size = 64 }) => {
  const normalizedTier = tier.toLowerCase();

  // SVG cho từng mức Rank
  const renderBadgeSvg = () => {
    switch (normalizedTier) {
      case 'bronze':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <defs>
              <linearGradient id="bronzeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a75d31" />
                <stop offset="50%" stopColor="#d88b5c" />
                <stop offset="100%" stopColor="#5c2e12" />
              </linearGradient>
              <linearGradient id="bronzeInner" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3d1f0c" />
                <stop offset="100%" stopColor="#783e1d" />
              </linearGradient>
              <filter id="3dShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>
            {/* Khiên tròn bằng đồng cổ xưa */}
            <g filter="url(#3dShadow)">
              <circle cx="50" cy="50" r="42" fill="url(#bronzeMetal)" stroke="#f59e0b" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="32" fill="url(#bronzeInner)" stroke="#271206" strokeWidth="2" />
              {/* Chi tiết rìu chéo cổ điển bên trong */}
              <path d="M35 35 L65 65 M65 35 L35 65" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
              {/* Ngôi sao đồng tâm */}
              <polygon points="50,28 55,42 70,42 58,51 62,65 50,56 38,65 42,51 30,42 45,42" fill="#d88b5c" stroke="#f59e0b" strokeWidth="1.5" />
            </g>
          </svg>
        );

      case 'silver':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <defs>
              <linearGradient id="silverMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="40%" stopColor="#f1f5f9" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <linearGradient id="silverBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <filter id="3dShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>
            {/* Khiên vát sắc nhọn kiểu hiệp sĩ */}
            <g filter="url(#3dShadow)">
              <path d="M50 10 L85 25 L75 70 L50 90 L25 70 L15 25 Z" fill="url(#silverMetal)" stroke="#cbd5e1" strokeWidth="2.5" />
              <path d="M50 20 L73 31 L66 65 L50 80 L34 65 L27 31 Z" fill="url(#silverBlue)" stroke="#1e293b" strokeWidth="1.5" />
              {/* Cánh chim bạc bên trong */}
              <path d="M35 40 Q50 50 65 40 Q50 65 35 40 Z" fill="url(#silverMetal)" />
              <circle cx="50" cy="48" r="7" fill="#cbd5e1" stroke="#f8fafc" strokeWidth="1" />
            </g>
          </svg>
        );

      case 'gold':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <defs>
              <linearGradient id="goldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="30%" stopColor="#fffbeb" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <linearGradient id="goldRuby" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
              <filter id="3dShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>
            {/* Khiên hoàng gia lộng lẫy */}
            <g filter="url(#3dShadow)">
              {/* Cánh vàng viền ngoài */}
              <path d="M50 8 L90 28 C90 60 70 82 50 92 C30 82 10 60 10 28 Z" fill="url(#goldMetal)" />
              {/* Lõi Ruby đỏ đậm đà */}
              <path d="M50 18 L78 33 C78 55 64 73 50 81 C36 73 22 55 22 33 Z" fill="url(#goldRuby)" stroke="#fbbf24" strokeWidth="2" />
              {/* Vương miện vàng ở trung tâm */}
              <path d="M38 58 L42 42 L50 49 L58 42 L62 58 Z" fill="url(#goldMetal)" stroke="#fff" strokeWidth="0.5" />
              <circle cx="50" cy="38" r="4" fill="#fbbf24" />
            </g>
          </svg>
        );

      case 'platinum':
        return (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <defs>
              <linearGradient id="platMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="30%" stopColor="#ffffff" />
                <stop offset="75%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="platEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#115e59" />
              </linearGradient>
              <filter id="3dShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>
            {/* Thiết kế cánh rồng cách điệu màu Bạch kim và Ngọc lục bảo */}
            <g filter="url(#3dShadow)">
              {/* Đôi cánh vút cao */}
              <path d="M50 18 L88 5 C95 40 78 72 50 94 C22 72 5 40 12 5 Z" fill="url(#platMetal)" />
              {/* Lõi ngọc lục bảo sang trọng */}
              <path d="M50 26 L76 18 C80 44 68 68 50 84 C32 68 20 44 24 18 Z" fill="url(#platEmerald)" stroke="#e2e8f0" strokeWidth="1.5" />
              {/* Thanh gươm công lý ở giữa */}
              <path d="M48 30 L52 30 L52 68 L48 68 Z" fill="url(#platMetal)" />
              <path d="M42 38 L58 38 L58 42 L42 42 Z" fill="url(#platMetal)" />
            </g>
          </svg>
        );

      case 'diamond':
        return (
          <svg viewBox="0 0 120 120" width="100%" height="100%">
            <defs>
              <linearGradient id="diaMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="30%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <linearGradient id="diaGem" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <filter id="3dShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.6" />
              </filter>
            </defs>
            {/* Khiên cánh gai nhọn pha lê xanh lam uốn lượn sắc sảo (như Liên Quân Diamond) */}
            <g filter="url(#3dShadow)" transform="translate(10, 10)">
              {/* Hai cụm tinh thể nhọn nhô ra 2 bên cánh */}
              <path d="M12 25 L32 28 L28 48 Z" fill="url(#diaMetal)" />
              <path d="M88 25 L68 28 L72 48 Z" fill="url(#diaMetal)" />
              <path d="M5 38 L25 42 L18 60 Z" fill="url(#diaGem)" />
              <path d="M95 38 L75 42 L82 60 Z" fill="url(#diaGem)" />
              
              {/* Khiên viền cung tròn ở giữa uốn lượn mềm mại */}
              <path d="M50 5 L82 25 C82 58 66 84 50 96 C34 84 18 58 18 25 Z" fill="url(#diaMetal)" stroke="#f1f5f9" strokeWidth="1.5" />
              {/* Trái tim ngọc Diamond phát sáng */}
              <path d="M50 18 L72 34 C72 58 60 76 50 86 C40 76 28 58 28 34 Z" fill="url(#diaGem)" stroke="#93c5fd" strokeWidth="2" />
              
              {/* Hoa văn ngọn giáo bạc nhô lên */}
              <path d="M50 25 L58 45 L50 38 L42 45 Z" fill="url(#diaMetal)" />
              <circle cx="50" cy="55" r="5" fill="#fff" opacity="0.9" />
            </g>
          </svg>
        );

      case 'master':
        return (
          <svg viewBox="0 0 120 120" width="100%" height="100%">
            <defs>
              <linearGradient id="masterGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="35%" stopColor="#fffbeb" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <linearGradient id="masterFlame" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#450a0a" />
              </linearGradient>
              <filter id="3dShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.7" />
              </filter>
            </defs>
            {/* Khiên Vương Miện Rồng Lửa rực cháy kiêu hãnh của bậc Cao Thủ */}
            <g filter="url(#3dShadow)" transform="translate(10, 10)">
              {/* Ngọn lửa phừng phực phía sau vươn ra ngoài */}
              <path d="M50 0 L72 18 L64 35 L88 28 L78 62 L50 85 L22 62 L12 28 L36 35 L28 18 Z" fill="url(#masterFlame)" opacity="0.85" />
              
              {/* Khung khiên mạ vàng sắc sảo chạm trổ */}
              <path d="M50 12 L80 32 C80 62 66 84 50 94 C34 84 20 62 20 32 Z" fill="url(#masterGold)" stroke="#fff" strokeWidth="1.5" />
              {/* Tâm khiên rực lửa với bảo ngọc đỏ */}
              <path d="M50 24 L70 38 C70 60 58 76 50 84 C42 76 30 60 30 38 Z" fill="url(#masterFlame)" stroke="#fbbf24" strokeWidth="2.5" />
              
              {/* Biểu tượng thanh kiếm rồng huyền thoại */}
              <path d="M50 30 L55 52 L50 48 L45 52 Z" fill="url(#masterGold)" />
              <polygon points="50,48 55,62 68,58 58,68 62,80 50,72 38,80 42,68 32,58 45,62" fill="url(#masterGold)" />
            </g>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`rank-badge-wrapper tier-${normalizedTier}`} 
      style={{ width: size, height: size }}
    >
      {renderBadgeSvg()}
    </div>
  );
};

export default RankBadge;
