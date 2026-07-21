import { IonIcon } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import RankBadge from '../../components/RankBadge';
import { RANK_TABLE, TIER_IDS } from '../../utils/rankSystem';
import './DesktopFocusControl.scss';

const RANK_LIST_DATA = TIER_IDS.map((tier) => {
  const firstDivision = RANK_TABLE.find((rank) => rank.tier === tier);
  return { tier, nameKey: `rank.${tier}`, rp: firstDivision.minRP };
});

const getRankProgressColor = (tier) => ({
  bronze: '#cd7f32', silver: '#a8c0d6', gold: '#f5c542',
  platinum: '#5dc8c8', diamond: '#a78bfa', master: '#f97316',
}[tier] || '#a78bfa');

const DesktopFocusControl = ({ currentRank, rankInfo, rp, isRankListOpen, rankListPage,
  isRankMode, isPanelOpen, onToggleRankList, onRankListPageChange, onModeChange, onTogglePanel }) => {
  const { t } = useTranslation();
  return (
    <div className="desktop-focus-control-center">
      {isRankListOpen && (
        <div className="rank-list-popover">
          <div className="popover-header">
            <button type="button" className="popover-nav-btn" disabled={rankListPage === 0} onClick={(event) => { event.stopPropagation(); onRankListPageChange(Math.max(0, rankListPage - 1)); }} aria-label={t('dashboard.previous_page')}><IonIcon icon={chevronBackOutline} aria-hidden="true" /></button>
            <span className="popover-title">{t('dashboard.rank_milestones')}</span>
            <button type="button" className="popover-nav-btn" disabled={rankListPage === 1} onClick={(event) => { event.stopPropagation(); onRankListPageChange(Math.min(1, rankListPage + 1)); }} aria-label={t('dashboard.next_page')}><IonIcon icon={chevronForwardOutline} aria-hidden="true" /></button>
          </div>
          <div className="popover-body">
            {RANK_LIST_DATA.slice(rankListPage * 3, (rankListPage + 1) * 3).map((item) => (
              <div key={item.tier} className="popover-rank-item"><RankBadge tier={item.tier} size={32} /><div className="popover-rank-info"><span className="popover-rank-name">{t(item.nameKey)}</span><span className="popover-rank-rp">{item.rp} RP</span></div></div>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="rank-display-box" onClick={onToggleRankList} aria-expanded={isRankListOpen} title={t('dashboard.rank_milestones')}>
        <div className="rank-badge-and-info"><RankBadge tier={currentRank} size={48} /><div className="rank-info-column"><div className="rank-display-header"><div className="rank-title-group"><span className={`rank-title rank-${currentRank}`}>{t(`rank.${currentRank}`)}</span><span className="rank-rp-text">({rp} RP)</span></div></div>
          {rankInfo.tier !== 'master' && <div className="rank-mini-progress-container"><div className="rank-mini-progress"><div className="rank-mini-progress-fill" style={{ width: `${rankInfo.progress}%`, background: getRankProgressColor(currentRank) }} /></div><span className="rank-mini-progress-text">{rankInfo.rpInDiv}/{rankInfo.rangeRP} RP</span></div>}
        </div></div>
      </button>
      <div className={`lq-start-container ${isRankMode ? 'mode-rank' : 'mode-casual'}`}>
        <div className="lq-mode-selector"><button type="button" className={`lq-mode-option casual ${!isRankMode ? 'active' : ''}`} onClick={() => onModeChange(false)}>{t('focus_guard.casual_mode')}</button><button type="button" className={`lq-mode-option rank ${isRankMode ? 'active' : ''}`} onClick={() => onModeChange(true)}>{t('focus_guard.rank_mode_short')}</button></div>
        <button type="button" className={`lq-start-button ${isRankMode ? 'mode-rank' : 'mode-casual'} ${isPanelOpen ? 'active' : ''}`} onClick={onTogglePanel} aria-expanded={isPanelOpen}><span className="lq-button-shiny-line" /><span className="lq-start-inner"><span className="lq-start-text"><IonIcon icon={shieldCheckmarkOutline} aria-hidden="true" style={{ marginRight: 6, fontSize: 18, verticalAlign: 'middle' }} />{t('focus_guard.start')}</span><span className="lq-start-sub">{t(isRankMode ? 'focus_guard.ranked_match' : 'focus_guard.casual_match')}</span></span></button>
      </div>
    </div>
  );
};
export default DesktopFocusControl;
