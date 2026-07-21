import React, { useState, useCallback } from 'react';
import guideChrome from './img/guide_chrome.png';
import guideEdge from './img/guide_edge.png';
import guideBrave from './img/guide_brave.png';
import guideOpera from './img/guide_opera.png';
import guideFirefox from './img/guide_firefox.png';
import guideDragDrop from './img/guide_dragdrop.png';
import './ExtensionGuide.scss';

const BROWSERS = [
  {
    id: 'chrome',
    label: 'Chrome',
    color: '#4285f4',
    icon: '🔵',
    extUrl: 'chrome://extensions',
    cmd: 'chrome',
    image: guideChrome,
    dragImage: guideDragDrop,
    steps: [
      { text: 'Nhấn nút', highlight: 'Mở trang Extensions', sub: 'bên dưới để mở Chrome' },
      { text: 'Bật công tắc', highlight: 'Developer mode', sub: '(góc trên bên phải)' },
      { text: 'Nhấn', highlight: 'Mở thư mục Extension', sub: '— cửa sổ nhỏ sẽ xuất hiện góc trên phải' },
      { text: 'Nắm kéo thư mục', highlight: 'browser-extension', sub: 'từ cửa sổ File Explorer vào trang Chrome Extensions' },
    ],
  },
  {
    id: 'edge',
    label: 'Edge',
    color: '#0078d4',
    icon: '🔷',
    extUrl: 'edge://extensions',
    cmd: 'edge',
    image: guideEdge,
    dragImage: guideDragDrop,
    steps: [
      { text: 'Nhấn nút', highlight: 'Mở trang Extensions', sub: 'bên dưới để mở Edge' },
      { text: 'Bật công tắc', highlight: 'Developer mode', sub: '(góc dưới bên trái sidebar)' },
      { text: 'Nhấn', highlight: 'Mở thư mục Extension', sub: '— cửa sổ nhỏ sẽ xuất hiện góc trên phải' },
      { text: 'Nắm kéo thư mục', highlight: 'browser-extension', sub: 'từ cửa sổ File Explorer vào trang Edge Extensions' },
    ],
  },
  {
    id: 'brave',
    label: 'Brave',
    color: '#fb542b',
    icon: '🦁',
    extUrl: 'brave://extensions',
    cmd: 'brave',
    image: guideBrave,
    dragImage: guideDragDrop,
    steps: [
      { text: 'Nhấn nút', highlight: 'Mở trang Extensions', sub: 'bên dưới để mở Brave' },
      { text: 'Bật công tắc', highlight: 'Developer mode', sub: '(góc trên bên phải)' },
      { text: 'Nhấn', highlight: 'Mở thư mục Extension', sub: '— cửa sổ nhỏ sẽ xuất hiện góc trên phải' },
      { text: 'Nắm kéo thư mục', highlight: 'browser-extension', sub: 'từ cửa sổ File Explorer vào trang Brave Extensions' },
    ],
  },
  {
    id: 'opera',
    label: 'Opera',
    color: '#ff1b2d',
    icon: '🔴',
    extUrl: 'opera://extensions',
    cmd: 'opera',
    image: guideOpera,
    dragImage: guideDragDrop,
    steps: [
      { text: 'Nhấn nút', highlight: 'Mở trang Extensions', sub: 'bên dưới để mở Opera' },
      { text: 'Bật công tắc', highlight: 'Developer mode', sub: '(góc trên bên phải)' },
      { text: 'Nhấn', highlight: 'Mở thư mục Extension', sub: '— cửa sổ nhỏ sẽ xuất hiện góc trên phải' },
      { text: 'Nắm kéo thư mục', highlight: 'browser-extension', sub: 'từ cửa sổ File Explorer vào trang Opera Extensions' },
    ],
  },
  {
    id: 'firefox',
    label: 'Firefox',
    color: '#ff9500',
    icon: '🦊',
    extUrl: 'about:debugging#/runtime/this-firefox',
    cmd: 'firefox',
    image: guideFirefox,
    dragImage: null,
    steps: [
      { text: 'Nhấn nút', highlight: 'Mở trang Extensions', sub: 'bên dưới để mở Firefox' },
      { text: 'Chọn mục', highlight: 'This Firefox', sub: 'ở thanh bên trái' },
      { text: 'Nhấn', highlight: 'Mở thư mục Extension', sub: '— cửa sổ nhỏ sẽ xuất hiện góc trên phải' },
      { text: 'Nhấn nút', highlight: 'Load Temporary Add-on...', sub: 'rồi chọn file manifest.json bên trong thư mục' },
    ],
  },
];

const ExtensionGuide = ({ missingBrowsers = [], onClose }) => {
  // Auto-select first missing browser tab
  const defaultTab = (() => {
    if (!missingBrowsers.length) return 'chrome';
    const missing = missingBrowsers[0].toLowerCase();
    const found = BROWSERS.find(b => missing.includes(b.id));
    return found ? found.id : 'chrome';
  })();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [folderOpened, setFolderOpened] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const activeBrowser = BROWSERS.find(b => b.id === activeTab);

  const handleOpenFolder = useCallback(async () => {
    if (window.api?.invoke) {
      await window.api.invoke('setup:openExtensionFolder');
      setFolderOpened(true);
    }
  }, []);

  const handleOpenExtPage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeBrowser.extUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
      
      // Vẫn gọi mở trình duyệt (sẽ mở tab mới)
      if (window.api?.invoke) {
        await window.api.invoke('setup:openBrowserExtPage', activeTab);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }, [activeTab, activeBrowser]);

  return (
    <>
      <div className="ext-guide">
        {/* Header */}
        <div className="ext-guide__header">
          <div className="ext-guide__title">
            <span className="ext-guide__title-icon">🧩</span>
            <span>Hướng dẫn cài Extension</span>
          </div>
          {onClose && (
            <button className="ext-guide__close" onClick={onClose}>✕</button>
          )}
        </div>

        <p className="ext-guide__subtitle">
          Chọn trình duyệt bạn đang dùng để xem hướng dẫn chi tiết
        </p>

        {/* Browser Tabs */}
        <div className="ext-guide__tabs">
          {BROWSERS.map(b => (
            <button
              key={b.id}
              className={`ext-guide__tab ${activeTab === b.id ? 'active' : ''} ${missingBrowsers.some(m => m.toLowerCase().includes(b.id)) ? 'missing' : ''}`}
              style={{ '--tab-color': b.color }}
              onClick={() => setActiveTab(b.id)}
            >
              <span className="ext-guide__tab-icon">{b.icon}</span>
              <span className="ext-guide__tab-label">{b.label}</span>
              {missingBrowsers.some(m => m.toLowerCase().includes(b.id)) && (
                <span className="ext-guide__tab-dot" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="ext-guide__content">
          {/* Screenshot: Extensions page */}
          <div className="ext-guide__img-label-top">Trang Extensions của {activeBrowser.label}</div>
          <div className="ext-guide__img-wrap" onClick={() => setShowFullImage('main')}>
            <img
              src={activeBrowser.image}
              alt={`${activeBrowser.label} extensions page`}
              className="ext-guide__img"
            />
            <div className="ext-guide__img-overlay">
              <span className="ext-guide__img-zoom">🔍 Phóng to ảnh</span>
            </div>
          </div>

          {/* Screenshot: Drag & Drop guide (Chromium only) */}
          {activeBrowser.dragImage && (
            <>
              <div className="ext-guide__img-label-top ext-guide__img-label-top--drag">
                🖱️ Cách kéo thả vào trình duyệt
              </div>
              <div className="ext-guide__img-wrap" onClick={() => setShowFullImage('drag')}>
                <img
                  src={activeBrowser.dragImage}
                  alt="Drag and drop guide"
                  className="ext-guide__img"
                />
                <div className="ext-guide__img-overlay">
                  <span className="ext-guide__img-zoom">🔍 Phóng to ảnh</span>
                </div>
              </div>
            </>
          )}

          {/* Steps */}
          <div className="ext-guide__steps">
            {activeBrowser.steps.map((step, i) => (
              <div key={i} className="ext-guide__step">
                <span className="ext-guide__step-num">{i + 1}</span>
                <div className="ext-guide__step-text">
                  <span>{step.text} </span>
                  <strong className="ext-guide__step-highlight" style={{ color: activeBrowser.color }}>
                    {step.highlight}
                  </strong>
                  {step.sub && <span className="ext-guide__step-sub"> {step.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="ext-guide__actions">
            <button
              className="ext-guide__btn ext-guide__btn--primary"
              onClick={handleOpenExtPage}
              style={{ '--btn-color': activeBrowser.color }}
            >
              {copiedLink ? `✅ Đã copy ${activeBrowser.extUrl}` : `🌐 Mở trình duyệt & Copy link (${activeBrowser.label})`}
            </button>

            <button
              className={`ext-guide__btn ext-guide__btn--folder ${folderOpened ? 'opened' : ''}`}
              onClick={handleOpenFolder}
            >
              {folderOpened ? '✅ Đã mở thư mục' : '📁 Mở thư mục Extension'}
            </button>
          </div>

          {activeTab === 'firefox' && (
            <p className="ext-guide__firefox-note">
              ⚠️ Firefox chỉ hỗ trợ <strong>Temporary Add-on</strong> — extension sẽ bị xóa sau khi restart. Hãy chọn file <code>manifest.json</code> trong thư mục extension.
            </p>
          )}

          <p className="ext-guide__hint">
            Sau khi cài xong, ứng dụng sẽ tự động nhận diện extension và cho phép bắt đầu.
          </p>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div className="ext-guide__modal" onClick={() => setShowFullImage(false)}>
          <div className="ext-guide__modal-content" onClick={e => e.stopPropagation()}>
            <div className="ext-guide__modal-header">
              <span>
                {showFullImage === 'drag'
                  ? '🖱️ Cách kéo thả Extension vào trình duyệt'
                  : `${activeBrowser.label} — Trang Extensions`}
              </span>
              <button className="ext-guide__modal-close" onClick={() => setShowFullImage(false)}>✕</button>
            </div>
            <img
              src={showFullImage === 'drag' ? activeBrowser.dragImage : activeBrowser.image}
              alt={showFullImage === 'drag' ? 'Drag and drop guide' : activeBrowser.label}
              className="ext-guide__modal-img"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ExtensionGuide;
