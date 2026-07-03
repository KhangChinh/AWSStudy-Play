import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { shieldCheckmarkOutline, closeOutline, lockClosedOutline, videocamOutline } from 'ionicons/icons';

import { getValidAccessToken } from '../../services/tokenService';
import { ingestServerData } from '../../services/syncService';
import { startTracking, stopTracking, reattachVideo, pauseTracking, resumeTracking } from './faceTracker';
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
  const [isStarting, setIsStarting] = useState(false);

  // Webcam state
  const [camActive, setCamActive] = useState(false);
  const [camStatus, setCamStatus] = useState('idle'); // idle | loading | tracking | warning | afk | error | spoof
  const [afkElapsed, setAfkElapsed] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
    missing: [],
    connected: false,
    noBrowserRunning: true,
  });

  const pollRef = useRef(null);
  const configSentRef = useRef(false);

  const isActive = timerStatus.active;
  const isPaused = timerStatus.paused;
  const remaining = timerStatus.remaining;
  const strikes = timerStatus.strikeCount;
  const strikeCount = timerStatus.strikeCount;

  const extensionBlocked = gateStatus.blocked;
  const noBrowser = gateStatus.noBrowserRunning;

  const currentScreen = extensionBlocked ? 'check-ext' : 'main';
  const canStart = !extensionBlocked && aiReady && !isStarting;

  useEffect(() => {
    const sendConfig = async () => {
      if (configSentRef.current) return;
      try {
        const token = await getValidAccessToken();
        if (token && window.api?.invoke) {
          await window.api.invoke('focus:setConfig', {
            token,
            apiUrl: import.meta.env.VITE_API_URL,
          });
          configSentRef.current = true;
        }
      } catch (err) {
        console.warn('[FocusGuard] Config send failed:', err);
      }
    };
    sendConfig();
  }, []);

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

    poll();
    pollRef.current = setInterval(poll, 1000);
    return () => clearInterval(pollRef.current);
  }, []);

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
            noBrowserRunning: !!data.noBrowserRunning,
          });
        }
      },
      'timer-expired': () => {
        toast.success('Focus session hoàn tất! 🎉');
        stopFaceTracking();
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
        stopFaceTracking();
        setTimerStatus((prev) => ({
          ...prev,
          active: false,
          paused: false,
          remaining: 0,
          strikeCount: 0,
        }));
      },
      'ai-classifying': (isClassifying) => {
        if (isClassifying) {
          pauseTracking();
        } else {
          resumeTracking();
        }
      },
      'quest-updated': (updatedQuests) => {
        // We can keep this for manual/partial updates if needed, but the main sync will happen in sessionEndData
        if (updatedQuests && window.api?.invoke) {
          window.api.invoke('quest:load').then((stored) => {
            const existingDaily = stored?.data || {};
            const updatedDaily = { ...existingDaily, quests: updatedQuests };
            window.api.invoke('quest:save', updatedDaily);
          });
          for (const [key, quest] of Object.entries(updatedQuests)) {
            if (key !== 'all_daily' && quest.isCompleted) {
              toast.success(`🎯 Nhiệm vụ "${quest.name}" đã hoàn thành!`);
            }
          }
          if (updatedQuests.all_daily?.isCompleted) {
            toast.success('🏆 Hoàn thành tất cả nhiệm vụ ngày!');
          }
        }
      },
      'focus:sessionEndData': (data) => {
        if (data && (data.profile || data.daily)) {
          console.log('[FocusGuard] Received sessionEndData payload, ingesting to Redux...');
          ingestServerData({
            profile: data.profile,
            daily: data.daily
          });
          // Also show toast notifications if quests completed during the session
          if (data.questUpdate) {
            for (const [key, quest] of Object.entries(data.questUpdate)) {
              if (key !== 'all_daily' && quest.isCompleted) {
                toast.success(`🎯 Nhiệm vụ "${quest.name}" đã hoàn thành!`);
              }
            }
            if (data.questUpdate.all_daily?.isCompleted) {
              toast.success('🏆 Hoàn thành tất cả nhiệm vụ ngày!');
            }
          }
        }
      },
    };

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

  const startFaceTracking = useCallback(async () => {
    if (!videoRef.current) return;
    setCamStatus('loading');
    setCamActive(false);

    await startTracking(videoRef.current, {
      onStatusUpdate: (status, elapsed) => {
        setCamStatus(status);
        setAfkElapsed(elapsed);
      },
      onAfkTimeout: () => {
        setCamStatus('afk');
        toast.error('AFK 5 phút! Session sẽ bị tính là FAILED.');
        if (window.api?.invoke) {
          window.api.invoke('focus:stop');
        }
      },
      onSpoofDetected: () => {
        setCamStatus('spoof');
        toast.error('🚨 Phát hiện ảnh tĩnh! Hãy ngồi trước camera thật.');
        if (window.api?.invoke) {
          window.api.invoke('focus:status').then((status) => {
            if (status?.active) {
              window.api.send('focus:widget-cam', 'spoof');
            }
          });
        }
      },
    });

    setCamActive(true);
  }, []);

  const stopFaceTracking = useCallback(() => {
    stopTracking();
    setCamActive(false);
    setCamStatus('idle');
    setAfkElapsed(0);
  }, []);

  useEffect(() => {
    if (isActive && !camActive && camStatus !== 'loading') {
      startFaceTracking();
    } else if (!isActive && camActive) {
      stopFaceTracking();
    }
  }, [isActive, camActive, camStatus, startFaceTracking, stopFaceTracking]);

  useEffect(() => {
    if (isActive && camActive && videoRef.current) {
      reattachVideo(videoRef.current);
    }
  }, [isActive, camActive]);

  useEffect(() => {
    if (!window.api?.send) return;
    window.api.send('focus:widget-state', {
      active: isActive,
      remaining,
      hardMode,
      strikeCount: strikes,
    });
  }, [isActive]);

  useEffect(() => {
    if (!window.api?.send || !isActive) return;
    window.api.send('focus:widget-timer', {
      remaining,
      hardMode,
      strikeCount: strikes,
    });
  }, [remaining, strikes, isActive, hardMode]);

  useEffect(() => {
    if (!window.api?.send || !isActive) return;
    window.api.send('focus:widget-cam', camStatus);
  }, [camStatus, isActive]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    try {
      if (window.api?.invoke) {
        await window.api.invoke('focus:start', { minutes, hardMode });
      }
    } catch (err) {
      toast.error('Không thể bắt đầu session!');
      console.error('[FocusGuard] Start error:', err);
    } finally {
      setIsStarting(false);
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

  return (
    <div className="focus-guard-app">
      <div className="focus-guard-panel app-mode">
        <div className="fg-body">
          {currentScreen === 'check-ext' && !isActive && (
            <div className="fg-screen-check">
              <div className="fg-check-icon">🔌</div>
              <h3 className="fg-check-title">Extension Chưa Kết Nối</h3>
              <p className="fg-check-desc">
                Trình duyệt đang mở nhưng chưa cài Extension.
                Hãy cài Extension để Focus Guard hoạt động.
              </p>
              <div className="fg-missing-browsers">
                {gateStatus.missing.length > 0 && (
                  <p className="fg-missing-label">
                    ⚠️ Thiếu extension: <strong>{gateStatus.missing.join(', ')}</strong>
                  </p>
                )}
              </div>
              <div className="fg-check-steps">
                <div className="fg-step"><span className="fg-step-num">1</span> Mở Chrome → <strong>chrome://extensions</strong></div>
                <div className="fg-step"><span className="fg-step-num">2</span> Bật <strong>Developer mode</strong></div>
                <div className="fg-step"><span className="fg-step-num">3</span> Click <strong>Load unpacked</strong> → chọn thư mục extension</div>
              </div>
              <p className="fg-check-hint">🔄 Tự động kiểm tra lại mỗi 3 giây...</p>
            </div>
          )}

          {currentScreen === 'main' && (
            <>
              <div className="fg-status-row">
                <div className="fg-status-badge">
                  <span className={`dot ${noBrowser ? 'gray' : (gateStatus.connected ? 'green' : 'red')}`} />
                  {noBrowser ? 'Không có trình duyệt' : (gateStatus.connected ? 'Extension OK' : 'Đang kiểm tra...')}
                </div>
                <div className="fg-status-badge">
                  <span className={`dot ${aiReady ? 'green' : 'yellow'}`} />
                  {aiReady ? 'AI Ready' : 'AI Chưa sẵn sàng'}
                </div>
              </div>

              {!aiReady && !isActive && (
                <div className="fg-ai-hint required">
                  <div className="fg-ai-providers">
                    <div className="fg-ai-item">
                      <span>🦙 Ollama (Local)</span>
                      <span className="fg-ai-badge off">✗ Chưa bật</span>
                    </div>
                  </div>
                  <p className="fg-ai-note">
                    ⚠️ <strong>Bắt buộc</strong> kết nối ít nhất 1 AI để bật Focus Mode.
                    Hãy mở Ollama hoặc thiết lập Groq API key.
                  </p>
                </div>
              )}

              {!isActive && !isPaused && (
                <>
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

                  <button
                    className="fg-start-btn"
                    onClick={handleStart}
                    disabled={!canStart}
                  >
                    {isStarting ? '⏳ Đang khởi tạo...' : '🚀 START FOCUS'}
                  </button>
                </>
              )}

              {isActive && !isPaused && (
                <>
                  <div className="fg-timer-display">
                    <span className="fg-countdown">{formatTime(timerStatus.remaining)}</span>
                    <span className="fg-timer-label">remaining</span>
                  </div>

                  <div className={`fg-webcam-container ${camActive ? 'active' : ''}`}>
                    <video ref={videoRef} autoPlay muted playsInline className="fg-webcam-video" />
                    <div className={`fg-webcam-status ${camStatus === 'warning' ? 'warn' : ''} ${camStatus === 'spoof' ? 'spoof' : ''}`}>
                      <IonIcon icon={videocamOutline} />
                      {camStatus === 'loading' && ' 🤖 Đang tải MediaPipe AI...'}
                      {camStatus === 'tracking' && ' ✅ Đang theo dõi'}
                      {camStatus === 'warning' && ` ⚠️ Không thấy mặt! (${Math.floor(afkElapsed / 1000)}s)`}
                      {camStatus === 'afk' && ' 🚨 AFK — Session Failed!'}
                      {camStatus === 'spoof' && ' 🚨 Phát hiện ảnh tĩnh!'}
                      {camStatus === 'error' && ' Không bật được cam'}
                      {camStatus === 'idle' && ' Đang khởi động...'}
                    </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FocusGuard;
