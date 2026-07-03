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
import './SetupWizard.scss';

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', emoji: '🌐', color: '#4285F4' },
  { id: 'edge', name: 'Microsoft Edge', emoji: '🔵', color: '#0078D4' },
];

const SetupWizard = ({ isConnected, onDismiss }) => {
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
            {step === 0 && 'Chào mừng đến Focus Guard'}
            {step === 1 && 'Bước 1 — Mở thư mục Extension'}
            {step === 2 && 'Bước 2 — Cài vào trình duyệt'}
            {step === 3 && 'Hoàn tất! 🎉'}
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
              <h3>Thiết lập ban đầu</h3>
              <p>
                Focus Guard cần một <strong>extension trình duyệt</strong> để có thể theo dõi và chặn
                các trang web giải trí khi bạn đang trong chế độ tập trung.
              </p>
              <div className="sw-info-card">
                <span className="sw-info-icon">💡</span>
                <span>Chỉ cần cài đặt 1 lần duy nhất. Chỉ mất khoảng 1 phút!</span>
              </div>
            </div>
          )}

          {/* Step 1: Open folder */}
          {step === 1 && (
            <div className="sw-step-content">
              <p className="sw-step-desc">
                Nhấn nút bên dưới để mở thư mục chứa extension. Bạn sẽ cần thư mục này ở bước tiếp theo.
              </p>
              <button
                className={`sw-action-btn ${folderOpened ? 'done' : ''}`}
                onClick={handleOpenExtensionFolder}
              >
                <IonIcon icon={folderOpened ? checkmarkCircleOutline : downloadOutline} />
                {folderOpened ? 'Đã mở thư mục!' : 'Mở thư mục Extension'}
              </button>
              {folderOpened && (
                <div className="sw-hint success">
                  ✅ Thư mục đã mở trong File Explorer. Giữ cửa sổ đó mở nhé!
                </div>
              )}
            </div>
          )}

          {/* Step 2: Install in browser */}
          {step === 2 && (
            <div className="sw-step-content">
              <p className="sw-step-desc">Chọn trình duyệt bạn đang sử dụng:</p>
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
                  <h4>📋 Hướng dẫn:</h4>
                  <ol>
                    <li>
                      Bật <strong>"Chế độ nhà phát triển"</strong> (Developer mode)
                      <span className="sw-toggle-hint"> — công tắc ở góc phải trên</span>
                    </li>
                    <li>
                      Nhấn nút <strong>"Tải tiện ích đã giải nén"</strong>
                      <span className="sw-toggle-hint"> — (Load unpacked)</span>
                    </li>
                    <li>
                      Chọn thư mục <strong>browser-extension</strong> đã mở ở Bước 1
                    </li>
                    <li>
                      Xong! Extension sẽ tự kết nối với app
                    </li>
                  </ol>
                  <div className="sw-waiting">
                    <div className="sw-waiting-dot"></div>
                    <span>Đang chờ extension kết nối...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="sw-done">
              <div className="sw-done-icon">✅</div>
              <h3>Extension đã kết nối thành công!</h3>
              <p>Focus Guard đã sẵn sàng bảo vệ bạn khỏi các trang giải trí.</p>
              <div className="sw-done-features">
                <div className="sw-feature"><span>🎬</span> Chặn video giải trí trên YouTube</div>
                <div className="sw-feature"><span>📱</span> Chặn mạng xã hội (Facebook, TikTok...)</div>
                <div className="sw-feature"><span>🌐</span> AI phân tích mọi trang web</div>
                <div className="sw-feature"><span>📸</span> Face tracking chống AFK</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sw-footer">
          {step > 0 && step < 3 && (
            <button className="sw-nav-btn back" onClick={() => setStep(step - 1)}>
              <IonIcon icon={chevronBackOutline} />
              Quay lại
            </button>
          )}
          <div className="sw-footer-spacer" />
          {step < 2 && (
            <button
              className="sw-nav-btn next"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
            >
              Tiếp theo
              <IonIcon icon={chevronForwardOutline} />
            </button>
          )}
          {step === 3 && (
            <button className="sw-nav-btn next done" onClick={onDismiss}>
              Bắt đầu sử dụng
              <IonIcon icon={chevronForwardOutline} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
