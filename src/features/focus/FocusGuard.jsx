import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { shieldCheckmarkOutline, closeOutline, lockClosedOutline, videocamOutline } from 'ionicons/icons';

import { getValidAccessToken } from '../../services/tokenService';
import { ingestServerData } from '../../services/syncService';
import { startTracking, stopTracking, reattachVideo, pauseTracking, resumeTracking } from './faceTracker';
import './FocusGuard.scss';

const CASUAL_DURATIONS = [15, 25, 45, 60];
const RANK_DURATIONS = [30, 60];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const FocusGuard = (props) => {
  const { t } = useTranslation();
  const aiSettings = useSelector(state => state.settings?.aiSettings);
  const blockerModel = aiSettings?.blocker?.selectedModel || '';
  const faceTrackModel = aiSettings?.faceTracking?.selectedModel || 'MediaPipe BlazeFace (TFLite, local)';
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [hardMode, setHardMode] = useState(props.defaultHardMode ?? false);

  useEffect(() => {
    if (props.defaultHardMode !== undefined) {
      setHardMode(props.defaultHardMode);
    }
  }, [props.defaultHardMode]);

  const [aiReady, setAiReady] = useState(false);
  const [aiStat, setAiStat] = useState(null);
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
    connectedBrowsers: [],
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
          const aiStatResult = await window.api.invoke('ai:status');
          if (aiStatResult) {
            setAiReady(!!aiStatResult.ready);
            setAiStat(aiStatResult);
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
            connectedBrowsers: Array.isArray(data.connected) ? data.connected : [],
            connected: Array.isArray(data.connected) ? data.connected.length > 0 : false,
            noBrowserRunning: !!data.noBrowserRunning,
          });
        }
      },
      'timer-expired': () => {
        toast.success(t('focus_guard.session_complete'));
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
        toast.error(t('focus_guard.session_failed'));
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
        }
      },
      'focus:sessionEndData': (data) => {
        if (data && (data.profile || data.daily)) {
          console.log('[FocusGuard] Received sessionEndData payload, ingesting to Redux...');
          ingestServerData({
            profile: data.profile,
            daily: data.daily
          });
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
        toast.error(t('focus_guard.afk_failed'));
        if (window.api?.invoke) {
          window.api.invoke('focus:stop');
        }
      },
      onSpoofDetected: () => {
        setCamStatus('spoof');
        toast.error(t('focus_guard.spoof_detected'));
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
    console.log(`[FocusGuard] 📷 Starting Face Tracking | Model: ${faceTrackModel}`);
    if (blockerModel) {
      console.log(`[FocusGuard] 🔎 AI Blocker will use model: ${blockerModel}`);
    }
    try {
      if (window.api?.invoke) {
        await window.api.invoke('focus:start', { minutes, hardMode, blockerModel });
      }
    } catch (err) {
      toast.error(t('focus_guard.start_failed'));
      console.error('[FocusGuard] Start error:', err);
    } finally {
      setIsStarting(false);
    }
  }, [minutes, hardMode, blockerModel, faceTrackModel]);

  const handleStop = useCallback(async () => {
    try {
      if (window.api?.invoke) {
        await window.api.invoke('focus:stop');
      }
    } catch (err) {
      toast.error(t('focus_guard.stop_failed'));
    }
  }, []);

  return (
    <div className="focus-guard-app">
      <div className="focus-guard-panel app-mode">
        <div className="fg-body">
          {currentScreen === 'check-ext' && !isActive && (
            <div className="fg-screen-check">
              <div className="fg-check-icon">🔌</div>
              <h3 className="fg-check-title">{t('focus_guard.extension_not_connected')}</h3>
              <p className="fg-check-desc">{t('focus_guard.extension_missing_desc')}</p>
              <div className="fg-missing-browsers">
                {gateStatus.missing.length > 0 && (
                  <p className="fg-missing-label">
                    {t('focus_guard.missing_extension')}: <strong>{gateStatus.missing.join(', ')}</strong>
                  </p>
                )}
              </div>
              <div className="fg-check-steps">
                <div className="fg-step"><span className="fg-step-num">1</span> {t('focus_guard.open_chrome_extensions')} <strong>chrome://extensions</strong></div>
                <div className="fg-step"><span className="fg-step-num">2</span> {t('focus_guard.enable_developer_mode')} <strong>Developer mode</strong></div>
                <div className="fg-step"><span className="fg-step-num">3</span> {t('focus_guard.click_load_unpacked')} <strong>Load unpacked</strong> {t('focus_guard.choose_extension_folder')}</div>
              </div>
              <p className="fg-check-hint">{t('focus_guard.auto_check_hint')}</p>
            </div>
          )}

          {currentScreen === 'main' && (
            <>
              <div className="fg-status-row">
                <div className="fg-status-badge">
                  <span className={`dot ${noBrowser ? 'gray' : (gateStatus.connected ? 'green' : 'red')}`} />
                  {noBrowser 
                    ? t('focus_guard.no_browser') 
                    : (gateStatus.connected 
                        ? `${t('focus_guard.extension_ok')} (${gateStatus.connectedBrowsers.join(', ')})` 
                        : t('focus_guard.checking')
                      )}
                </div>
                <div className="fg-status-badge">
                  <span className={`dot ${aiReady ? 'green' : 'yellow'}`} />
                  {aiReady 
                    ? `${t('focus_guard.ai_ready')} (${aiStat?.activeProvider ? aiStat.activeProvider.charAt(0).toUpperCase() + aiStat.activeProvider.slice(1) : ''})` 
                    : t('focus_guard.ai_not_ready')
                  }
                </div>
              </div>

              {!aiReady && !isActive && (
                <div className="fg-ai-hint required">
                  <div className="fg-ai-providers">
                    {aiStat?.bedrock?.available ? (
                      <div className="fg-ai-item">
                        <span>Bedrock (AWS)</span>
                        <span className="fg-ai-badge on">Ready</span>
                      </div>
                    ) : aiStat?.gemini?.available ? (
                      <div className="fg-ai-item">
                        <span>Gemini (Cloud)</span>
                        <span className="fg-ai-badge on">Ready</span>
                      </div>
                    ) : aiStat?.ollama?.available ? (
                      <div className="fg-ai-item">
                        <span>{t('focus_guard.ollama_local')}</span>
                        <span className="fg-ai-badge on">Ready</span>
                      </div>
                    ) : (
                      <>
                        <div className="fg-ai-item">
                          <span>{t('focus_guard.ollama_local')}</span>
                          <span className="fg-ai-badge off">{t('focus_guard.not_enabled')}</span>
                        </div>
                        <div className="fg-ai-item">
                          <span>Cloud AI (AWS/Gemini)</span>
                          <span className="fg-ai-badge off">No API Key</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="fg-ai-note" dangerouslySetInnerHTML={{ __html:
                    aiStat?.bedrock?.available || aiStat?.gemini?.available || aiStat?.ollama?.available
                      ? 'AI is initializing, please wait...'
                      : t('focus_guard.ai_required_note')
                  }} />
                </div>
              )}

              {!isActive && !isPaused && (
                <>
                  <span className="fg-duration-label">{t('focus_guard.duration')}</span>
                  <div className="fg-duration-group">
                    {(hardMode ? RANK_DURATIONS : CASUAL_DURATIONS).map((d) => (
                      <button
                        key={d}
                        className={`fg-duration-btn ${minutes === d ? 'active' : ''}`}
                        onClick={() => setMinutes(d)}
                      >
                        {d}m
                      </button>
                    ))}
                    <div className={`fg-custom-duration ${!(hardMode ? RANK_DURATIONS : CASUAL_DURATIONS).includes(minutes) ? 'active' : ''}`}>
                      <input 
                        type="number" 
                        min="60" 
                        max="300"
                        className={`fg-duration-input`}
                        placeholder="..."
                        value={(hardMode ? RANK_DURATIONS : CASUAL_DURATIONS).includes(minutes) ? '' : minutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setMinutes(val);
                          } else if (e.target.value === '') {
                            setMinutes(hardMode ? RANK_DURATIONS[0] : CASUAL_DURATIONS[0]);
                          }
                        }}
                        onBlur={() => {
                          if (!CASUAL_DURATIONS.includes(minutes) && !RANK_DURATIONS.includes(minutes)) {
                            if (minutes < 60) setMinutes(60);
                          }
                        }}
                      />
                      <span className="fg-custom-min-label">m</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '-12px', marginBottom: '16px', textAlign: 'right' }}>
                    * Custom tối thiểu 60 phút
                  </div>

                  <div className="fg-mode-toggle">
                    <button
                      className={`fg-mode-btn ${!hardMode ? 'active' : ''}`}
                      onClick={() => {
                        setHardMode(false);
                        if (!CASUAL_DURATIONS.includes(minutes)) setMinutes(CASUAL_DURATIONS[0]);
                      }}
                    >
                      <span className="mode-label">{t('focus_guard.casual_mode')}</span>
                      <span className="mode-desc">{t('focus_guard.casual_desc')}</span>
                    </button>
                    <button
                      className={`fg-mode-btn ${hardMode ? 'active' : ''}`}
                      onClick={() => {
                        setHardMode(true);
                        if (!RANK_DURATIONS.includes(minutes)) setMinutes(RANK_DURATIONS[0]);
                      }}
                    >
                      <span className="mode-label">{t('focus_guard.rank_mode')}</span>
                      <span className="mode-desc">{t('focus_guard.rank_desc')}</span>
                    </button>
                  </div>

                  <button
                    className="fg-start-btn"
                    onClick={handleStart}
                    disabled={!canStart}
                  >
                    {isStarting ? t('focus_guard.starting') : t('focus_guard.start_focus')}
                  </button>
                </>
              )}

              {isActive && !isPaused && (
                <>
                  <div className="fg-timer-display">
                    <span className="fg-countdown">{formatTime(timerStatus.remaining)}</span>
                    <span className="fg-timer-label">{t('focus_guard.remaining')}</span>
                  </div>

                  <div className={`fg-webcam-container ${camActive ? 'active' : ''}`}>
                    <video ref={videoRef} autoPlay muted playsInline className="fg-webcam-video" />
                    <div className={`fg-webcam-status ${camStatus === 'warning' ? 'warn' : ''} ${camStatus === 'spoof' ? 'spoof' : ''}`}>
                      <IonIcon icon={videocamOutline} />
                      {camStatus === 'loading' && t('focus_guard.cam_loading')}
                      {camStatus === 'tracking' && t('focus_guard.cam_tracking')}
                      {camStatus === 'warning' && t('focus_guard.cam_warning', { seconds: Math.floor(afkElapsed / 1000) })}
                      {camStatus === 'afk' && t('focus_guard.cam_afk')}
                      {camStatus === 'spoof' && t('focus_guard.cam_spoof')}
                      {camStatus === 'error' && t('focus_guard.cam_error')}
                      {camStatus === 'idle' && t('focus_guard.cam_idle')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span className={`fg-mode-badge ${timerStatus.hardMode ? 'rank' : 'casual'}`}>
                      {timerStatus.hardMode ? t('focus_guard.rank_mode') : t('focus_guard.casual_mode')}
                    </span>
                  </div>

                  <div className={`fg-strikes strikes-${Math.min(strikeCount, 3)}`}>
                    {t('focus_guard.strikes', { count: strikeCount })}
                  </div>

                  {timerStatus.hardMode ? (
                    <div className="fg-hardmode-label">
                      <IonIcon icon={lockClosedOutline} />
                      {t('focus_guard.hard_mode_cannot_stop')}
                    </div>
                  ) : (
                    <button className="fg-stop-btn" onClick={handleStop}>
                      {t('focus_guard.stop_session')}
                    </button>
                  )}
                </>
              )}

              {isPaused && (
                <>
                  <div className="fg-timer-display">
                    <span className="fg-countdown">{formatTime(timerStatus.remaining)}</span>
                    <span className="fg-paused-label">{t('focus_guard.paused')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span className="fg-mode-badge casual">{t('focus_guard.casual_mode')}</span>
                  </div>

                  <div className={`fg-strikes strikes-${Math.min(strikeCount, 3)}`}>
                    ⚠️ Strikes: {strikeCount}/3
                  </div>

                  <button className="fg-resume-btn" onClick={handleStart}>
                    {t('focus_guard.resume')}
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
