import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { shieldCheckmarkOutline, closeOutline, lockClosedOutline } from 'ionicons/icons';

import { getValidIdToken } from '../../services/authHelper';
import './FocusGuard.scss';

const DURATIONS = [15, 25, 45, 60];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const FocusGuard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [hardMode, setHardMode] = useState(false);
  const [aiReady, setAiReady] = useState(false);

  const [timerStatus, setTimerStatus] = useState({
    active: false,
    hardMode: false,
    paused: false,
    remaining: 0,
    totalMinutes: 0,
    strikeCount: 0,
  });

  const [gateStatus, setGateStatus] = useState({
    blocked: false,
    missing: true,
    connected: false,
  });

  const pollRef = useRef(null);
  const configSentRef = useRef(false);

  // ── Send config to Electron on mount ──
  useEffect(() => {
    const sendConfig = async () => {
      if (configSentRef.current) return;
      try {
        const token = await getValidIdToken();
        if (token && window.api?.invoke) {
          await window.api.invoke('focus:setConfig', {
            token,
            apiUrl: import.meta.env.VITE_USER_API_URL,
          });
          configSentRef.current = true;
        }
      } catch (err) {
        console.warn('[FocusGuard] Config send failed:', err);
      }
    };
    sendConfig();
  }, []);

  // ── Poll focus:status every 1s ──
  useEffect(() => {
    const poll = async () => {
      try {
        if (window.api?.invoke) {
          const status = await window.api.invoke('focus:status');
          if (status) {
            setTimerStatus({
              active: !!status.active,
              hardMode: !!status.hardMode,
              paused: !!status.paused,
              remaining: Math.floor((status.remaining || 0) / 1000),
              totalMinutes: status.totalMinutes || 0,
              strikeCount: status.strikeCount || 0,
            });
          }
          const aiStat = await window.api.invoke('ai:status');
          if (aiStat) {
            setAiReady(!!aiStat.ready);
          }
        }
      } catch (err) {
        // silent
      }
    };

    poll(); // immediate first poll
    pollRef.current = setInterval(poll, 1000);
    return () => clearInterval(pollRef.current);
  }, []);

  // ── Listen for IPC events ──
  useEffect(() => {
    if (!window.api?.on) return;

    const handlers = {
      'focus-mode-changed': (data) => {
        if (data) {
          setTimerStatus((prev) => ({ ...prev, ...data }));
        }
      },
      'gate-status': (data) => {
        if (data) {
          setGateStatus({
            blocked: !!data.blocked,
            missing: Array.isArray(data.missing) ? data.missing : [],
            connected: Array.isArray(data.connected) ? data.connected.length > 0 : false,
          });
        }
      },
      'timer-expired': () => {
        toast.success('Focus session hoàn tất! 🎉');
        setTimerStatus((prev) => ({
          ...prev,
          active: false,
          paused: false,
          remaining: 0,
          strikeCount: 0,
        }));
      },
      'strike-recorded': (data) => {
        if (data) {
          setTimerStatus((prev) => ({
            ...prev,
            strikeCount: data.strikeCount || prev.strikeCount,
          }));
        }
      },
      'session-failed': () => {
        toast.error('Session thất bại! 3 lần vi phạm.');
        setTimerStatus((prev) => ({
          ...prev,
          active: false,
          paused: false,
          remaining: 0,
          strikeCount: 0,
        }));
      },
    };

    // Register all listeners
    const cleanups = Object.entries(handlers).map(([event, handler]) => {
      window.api.on(event, handler);
      return () => {
        if (window.api.removeListener) {
          window.api.removeListener(event, handler);
        }
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // ── Actions ──
  const handleStart = useCallback(async () => {
    try {
      if (window.api?.invoke) {
        await window.api.invoke('focus:start', { minutes, hardMode });
      }
    } catch (err) {
      toast.error('Không thể bắt đầu session!');
      console.error('[FocusGuard] Start error:', err);
    }
  }, [minutes, hardMode]);

  const handleStop = useCallback(async () => {
    try {
      if (window.api?.invoke) {
        await window.api.invoke('focus:stop');
      }
    } catch (err) {
      toast.error('Không thể dừng session!');
    }
  }, []);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
    }, 200);
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  }, [isOpen, handleClose]);

  // ── Derived state ──
  const isActive = timerStatus.active;
  const isPaused = timerStatus.paused;
  const canStart = gateStatus.connected && aiReady && !gateStatus.blocked;
  const strikeCount = timerStatus.strikeCount;

  return (
    <>
      {/* ═══ Trigger Button ═══ */}
      <button
        className={`focus-guard-trigger ${isOpen ? 'active' : ''} ${isActive ? 'timer-active' : ''}`}
        onClick={handleToggle}
        title="Focus Guard"
      >
        <IonIcon icon={shieldCheckmarkOutline} />
      </button>

      {/* ═══ Panel ═══ */}
      {isOpen && (
        <div className={`focus-guard-panel ${closing ? 'closing' : ''}`}>
          {/* Header */}
          <div className="fg-header">
            <div className="fg-title">
              <IonIcon icon={shieldCheckmarkOutline} className="fg-title-icon" />
              Focus Guard
            </div>
            <button className="fg-close" onClick={handleClose}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>

          {/* Body */}
          <div className="fg-body">
            {/* Status Badges */}
            <div className="fg-status-row">
              <div className="fg-status-badge">
                <span className={`dot ${gateStatus.connected ? 'green' : 'red'}`} />
                {gateStatus.connected ? 'Connected' : 'Missing extension'}
              </div>
              <div className="fg-status-badge">
                <span className={`dot ${aiReady ? 'green' : 'red'}`} />
                {aiReady ? 'AI Ready' : 'AI Not ready'}
              </div>
            </div>

            {/* ─── SETUP MODE (timer not active) ─── */}
            {!isActive && !isPaused && (
              <>
                {/* Duration Selector */}
                <span className="fg-duration-label">Duration</span>
                <div className="fg-duration-group">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      className={`fg-duration-btn ${minutes === d ? 'active' : ''}`}
                      onClick={() => setMinutes(d)}
                    >
                      {d}m
                    </button>
                  ))}
                </div>

                {/* Mode Toggle */}
                <div className="fg-mode-toggle">
                  <button
                    className={`fg-mode-btn ${!hardMode ? 'active' : ''}`}
                    onClick={() => setHardMode(false)}
                  >
                    <span className="mode-label">☕ Casual</span>
                    <span className="mode-desc">Can pause & stop</span>
                  </button>
                  <button
                    className={`fg-mode-btn ${hardMode ? 'active' : ''}`}
                    onClick={() => setHardMode(true)}
                  >
                    <span className="mode-label">⚔️ Rank</span>
                    <span className="mode-desc">No escape!</span>
                  </button>
                </div>

                {/* Start Button */}
                <button
                  className="fg-start-btn"
                  onClick={handleStart}
                  disabled={!canStart}
                >
                  🚀 START FOCUS
                </button>
              </>
            )}

            {/* ─── ACTIVE MODE (timer running) ─── */}
            {isActive && !isPaused && (
              <>
                <div className="fg-timer-display">
                  <span className="fg-countdown">{formatTime(timerStatus.remaining)}</span>
                  <span className="fg-timer-label">remaining</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className={`fg-mode-badge ${timerStatus.hardMode ? 'rank' : 'casual'}`}>
                    {timerStatus.hardMode ? '⚔️ Rank Mode' : '☕ Casual'}
                  </span>
                </div>

                <div className={`fg-strikes strikes-${Math.min(strikeCount, 3)}`}>
                  ⚠️ Strikes: {strikeCount}/3
                </div>

                {timerStatus.hardMode ? (
                  <div className="fg-hardmode-label">
                    <IonIcon icon={lockClosedOutline} />
                    Hard Mode — Cannot stop
                  </div>
                ) : (
                  <button className="fg-stop-btn" onClick={handleStop}>
                    ■ STOP SESSION
                  </button>
                )}
              </>
            )}

            {/* ─── PAUSED MODE (casual only) ─── */}
            {isPaused && (
              <>
                <div className="fg-timer-display">
                  <span className="fg-countdown">{formatTime(timerStatus.remaining)}</span>
                  <span className="fg-paused-label">⏸ PAUSED</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span className="fg-mode-badge casual">☕ Casual</span>
                </div>

                <div className={`fg-strikes strikes-${Math.min(strikeCount, 3)}`}>
                  ⚠️ Strikes: {strikeCount}/3
                </div>

                <button className="fg-resume-btn" onClick={handleStart}>
                  ▶ RESUME
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FocusGuard;
