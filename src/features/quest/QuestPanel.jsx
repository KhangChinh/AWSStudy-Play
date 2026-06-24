import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  checkmarkCircleOutline, giftOutline, starOutline,
  trophyOutline, flameOutline, ribbonOutline
} from 'ionicons/icons';

import { getDailyQuests, claimQuestReward } from '../../services/questService';
import { setDailyQuests, updateQuestProgress, setEconomy } from '../../store/actions';
import './QuestPanel.scss';

const QUEST_ICONS = {
  FOCUS: flameOutline,
  PLAY_SUDOKU: starOutline,
  PLAY_MINESWEEPER: starOutline,
  GACHA: giftOutline,
  COMPLETE_DAILY: trophyOutline,
};

const QuestPanel = ({ dailyQuests, dispatch, economy }) => {
  const [loading, setLoading] = useState(false);
  const [claimingKey, setClaimingKey] = useState(null);

  // Load quests: ưu tiên Redux → electron-store → API
  const loadQuests = useCallback(async () => {
    // Nếu Redux đã có data và chưa hết hạn → không cần load
    if (dailyQuests?.quests && dailyQuests?.expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (dailyQuests.expiresAt > now) return;
    }

    setLoading(true);
    try {
      // Thử load từ electron-store trước
      if (window.api?.invoke) {
        const stored = await window.api.invoke('quest:load');
        if (stored?.data?.quests && stored.data.expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          if (stored.data.expiresAt > now) {
            dispatch(setDailyQuests(stored.data));
            setLoading(false);
            return;
          }
        }
      }

      // Fallback: gọi API
      const result = await getDailyQuests();
      if (result.success && result.daily) {
        dispatch(setDailyQuests(result.daily));
        // Lưu vào electron-store
        if (window.api?.invoke) {
          await window.api.invoke('quest:save', result.daily);
        }
      }
    } catch (err) {
      console.error('[QuestPanel] Load quests error:', err);
    }
    setLoading(false);
  }, [dailyQuests, dispatch]);

  useEffect(() => {
    loadQuests();
  }, []);

  // Listen for quest-updated from Redux (khi FocusGuard dispatch)
  useEffect(() => {
    if (!dailyQuests?.quests) return;
    // Đã được xử lý qua Redux dispatch
  }, [dailyQuests]);

  const handleClaim = async (questKey) => {
    if (claimingKey) return;
    setClaimingKey(questKey);

    try {
      const result = await claimQuestReward(questKey);
      if (result.success) {
        toast.success(`✨ ${result.message || 'Nhận thưởng thành công!'}`);

        // Cập nhật quest state
        const updatedQuests = { ...dailyQuests.quests };
        if (questKey === 'all_daily') {
          updatedQuests.all_daily = { ...updatedQuests.all_daily, isClaimed: true };
        } else {
          updatedQuests[questKey] = { ...updatedQuests[questKey], isClaimed: true };
        }

        const updatedDaily = {
          ...dailyQuests,
          quests: updatedQuests,
        };

        dispatch(setDailyQuests(updatedDaily));

        // Cập nhật economy
        if (result.newKnowledgePoint !== undefined) {
          dispatch(setEconomy({ knowledgePoint: result.newKnowledgePoint }));
        }

        // Lưu electron-store
        if (window.api?.invoke) {
          await window.api.invoke('quest:save', updatedDaily);
        }
      } else {
        toast.error(result.error || result.message || 'Nhận thưởng thất bại!');
      }
    } catch (err) {
      toast.error('Lỗi kết nối server!');
    }
    setClaimingKey(null);
  };

  const quests = dailyQuests?.quests || {};
  const questEntries = Object.entries(quests).filter(([key]) => key !== 'all_daily');
  const allDaily = quests.all_daily || null;

  if (loading) {
    return (
      <div className="quest-panel">
        <div className="quest-loading">
          <div className="quest-spinner" />
          <p>Đang tải nhiệm vụ...</p>
        </div>
      </div>
    );
  }

  if (!dailyQuests || questEntries.length === 0) {
    return (
      <div className="quest-panel">
        <div className="quest-empty">
          <IonIcon icon={ribbonOutline} className="empty-icon" />
          <p>Chưa có nhiệm vụ ngày nào.</p>
          <button className="quest-btn refresh-btn" onClick={loadQuests}>Tải lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quest-panel">
      <div className="quest-header">
        <h2><IonIcon icon={trophyOutline} /> Nhiệm vụ ngày</h2>
        <span className="quest-timer">
          Hết hạn: {new Date(dailyQuests.expiresAt * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="quest-list">
        {questEntries.map(([key, quest]) => {
          const progress = Math.min(quest.progress || 0, quest.target || 1);
          const target = quest.target || 1;
          const percent = Math.min(100, Math.floor((progress / target) * 100));
          const icon = QUEST_ICONS[quest.type] || starOutline;
          const canClaim = quest.isCompleted && !quest.isClaimed;
          const isClaimed = quest.isClaimed;

          return (
            <div className={`quest-card ${isClaimed ? 'claimed' : ''} ${quest.isCompleted ? 'completed' : ''}`} key={key}>
              <div className="quest-icon-wrap">
                <IonIcon icon={icon} />
              </div>
              <div className="quest-info">
                <div className="quest-name">{quest.name}</div>
                <div className="quest-desc">{quest.description}</div>
                <div className="quest-progress-bar">
                  <div className="quest-progress-fill" style={{ width: `${percent}%` }} />
                  <span className="quest-progress-text">{progress}/{target}</span>
                </div>
              </div>
              <div className="quest-reward-section">
                <span className="quest-reward-amount">+{quest.knowledgePoint || 0} KP</span>
                {isClaimed ? (
                  <div className="quest-btn claimed-badge">
                    <IonIcon icon={checkmarkCircleOutline} /> Đã nhận
                  </div>
                ) : (
                  <button
                    className={`quest-btn claim-btn ${canClaim ? 'active' : 'disabled'}`}
                    disabled={!canClaim || claimingKey === key}
                    onClick={() => handleClaim(key)}
                  >
                    {claimingKey === key ? (
                      <span className="btn-spinner" />
                    ) : (
                      <>
                        <IonIcon icon={giftOutline} /> Nhận
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All Daily Quest */}
      {allDaily && (
        <div className={`quest-card all-daily-card ${allDaily.isClaimed ? 'claimed' : ''} ${allDaily.isCompleted ? 'completed' : ''}`}>
          <div className="quest-icon-wrap all-daily-icon">
            <IonIcon icon={trophyOutline} />
          </div>
          <div className="quest-info">
            <div className="quest-name">{allDaily.name}</div>
            <div className="quest-desc">{allDaily.description}</div>
            <div className="quest-progress-bar all-daily-bar">
              <div
                className="quest-progress-fill"
                style={{ width: `${Math.min(100, Math.floor(((allDaily.progress || 0) / (allDaily.target || 4)) * 100))}%` }}
              />
              <span className="quest-progress-text">
                {allDaily.progress || 0}/{allDaily.target || 4}
              </span>
            </div>
          </div>
          <div className="quest-reward-section">
            <span className="quest-reward-amount bonus">+{allDaily.knowledgePoint || 100} KP</span>
            {allDaily.isClaimed ? (
              <div className="quest-btn claimed-badge">
                <IonIcon icon={checkmarkCircleOutline} /> Đã nhận
              </div>
            ) : (
              <button
                className={`quest-btn claim-btn ${allDaily.isCompleted ? 'active' : 'disabled'}`}
                disabled={!allDaily.isCompleted || claimingKey === 'all_daily'}
                onClick={() => handleClaim('all_daily')}
              >
                {claimingKey === 'all_daily' ? (
                  <span className="btn-spinner" />
                ) : (
                  <>
                    <IonIcon icon={giftOutline} /> Nhận
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  dailyQuests: state.dailyQuests,
  economy: state.economy,
});

export default connect(mapStateToProps)(QuestPanel);
