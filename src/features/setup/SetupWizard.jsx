import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import {
  shieldCheckmarkOutline,
  downloadOutline,
  openOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  chevronBackOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './SetupWizard.scss';

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', emoji: '🌐', color: '#4285F4' },
  { id: 'edge', name: 'Microsoft Edge', emoji: '🔵', color: '#0078D4' },
];

const SetupWizard = ({ isConnected, onDismiss }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [selectedBrowser, setSelectedBrowser] = useState(null);
  const [folderOpened, setFolderOpened] = useState(false);

  // Auto-advance to step 3 when extension connects
  useEffect(() => {
    if (isConnected && step >= 1) {
      setStep(3);
    }
  }, [isConnected]);

  const handleOpenExtensionFolder = async () => {
    if (window.api?.invoke) {
      await window.api.invoke('setup:openExtensionFolder');
      setFolderOpened(true);
    }
  };

  const handleOpenBrowserExtPage = async (browser) => {
    setSelectedBrowser(browser.id);
    if (window.api?.invoke) {
      await window.api.invoke('setup:openBrowserExtPage', browser.id);
    }
  };

  const canGoNext = () => {
    if (step === 0) return true;
    if (step === 1) return folderOpened;
    if (step === 2) return isConnected;
    return true;
  };

  return (
    <div className="setup-wizard-overlay">
      <div className="setup-wizard">
        {/* Header */}
        <div className="sw-header">
          <div className="sw-header-icon">
            <IonIcon icon={shieldCheckmarkOutline} />
          </div>
          <h2 className="sw-header-title">
            {step === 0 && t('setup.welcome_title')}
            {step === 1 && t('setup.step_open_folder')}
            {step === 2 && t('setup.step_install_browser')}
            {step === 3 && t('setup.done_title')}
          </h2>
          <div className="sw-progress">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`sw-progress-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="sw-body">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="sw-welcome">
              <div className="sw-welcome-icon">🛡️</div>
              <h3>{t('setup.initial_setup')}</h3>
              <p dangerouslySetInnerHTML={{ __html: t('setup.welcome_desc') }} />
              <div className="sw-info-card">
                <span className="sw-info-icon">💡</span>
                <span>{t('setup.one_time_note')}</span>
              </div>
            </div>
          )}

          {/* Step 1: Open folder */}
          {step === 1 && (
            <div className="sw-step-content">
              <p className="sw-step-desc">{t('setup.open_folder_desc')}</p>
              <button
                className={`sw-action-btn ${folderOpened ? 'done' : ''}`}
                onClick={handleOpenExtensionFolder}
              >
                <IonIcon icon={folderOpened ? checkmarkCircleOutline : downloadOutline} />
                {folderOpened ? t('setup.folder_opened') : t('setup.open_extension_folder')}
              </button>
              {folderOpened && (
                <div className="sw-hint success">
                  {t('setup.folder_opened_hint')}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Install in browser */}
          {step === 2 && (
            <div className="sw-step-content">
              <p className="sw-step-desc">{t('setup.choose_browser')}</p>
              <div className="sw-browser-list">
                {BROWSERS.map((b) => (
                  <button
                    key={b.id}
                    className={`sw-browser-btn ${selectedBrowser === b.id ? 'selected' : ''}`}
                    onClick={() => handleOpenBrowserExtPage(b)}
                    style={{ '--browser-color': b.color }}
                  >
                    <span className="sw-browser-emoji">{b.emoji}</span>
                    <span>{b.name}</span>
                    <IonIcon icon={openOutline} className="sw-open-icon" />
                  </button>
                ))}
              </div>
              {selectedBrowser && (
                <div className="sw-instructions">
                  <h4>{t('setup.instructions')}</h4>
                  <ol>
                    <li>
                      {t('setup.instruction_dev_mode')} <strong>{t('setup.developer_mode')}</strong>
                      <span className="sw-toggle-hint"> {t('setup.dev_mode_hint')}</span>
                    </li>
                    <li>
                      {t('setup.instruction_load_unpacked')} <strong>{t('setup.load_unpacked')}</strong>
                      <span className="sw-toggle-hint"> {t('setup.load_unpacked_hint')}</span>
                    </li>
                    <li>
                      {t('setup.choose_extension_folder')} <strong>browser-extension</strong>
                    </li>
                    <li>
                      {t('setup.extension_auto_connect')}
                    </li>
                  </ol>
                  <div className="sw-waiting">
                    <div className="sw-waiting-dot"></div>
                    <span>{t('setup.waiting_connection')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="sw-done">
              <div className="sw-done-icon">✅</div>
              <h3>{t('setup.connected_title')}</h3>
              <p>{t('setup.connected_desc')}</p>
              <div className="sw-done-features">
                <div className="sw-feature"><span>🎬</span> {t('setup.feature_youtube')}</div>
                <div className="sw-feature"><span>📱</span> {t('setup.feature_social')}</div>
                <div className="sw-feature"><span>🌐</span> {t('setup.feature_ai')}</div>
                <div className="sw-feature"><span>📸</span> {t('setup.feature_face_tracking')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sw-footer">
          {step > 0 && step < 3 && (
            <button className="sw-nav-btn back" onClick={() => setStep(step - 1)}>
              <IonIcon icon={chevronBackOutline} />
              {t('common.back')}
            </button>
          )}
          <div className="sw-footer-spacer" />
          {step < 2 && (
            <button
              className="sw-nav-btn next"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
            >
              {t('common.next')}
              <IonIcon icon={chevronForwardOutline} />
            </button>
          )}
          {step === 3 && (
            <button className="sw-nav-btn next done" onClick={onDismiss}>
              {t('setup.start_using')}
              <IonIcon icon={chevronForwardOutline} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
