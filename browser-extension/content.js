(function () {
  'use strict';

  /* ===== STATE ===== */
  let focusMode = false;
  let currentVideoId = null;
  let overlayEl = null;
  let pauseInterval = null;
  let strikeTimer = null; // 10-second countdown timer
  let strikeReported = false; // prevent duplicate reports for same video
  let currentBlockedVideoId = null; // track which video is currently showing overlay

  /* ===== CLASSIFICATION CONFIG ===== */
  const BLOCKED_CATEGORIES = [
    'Gaming', 'Music', 'Entertainment', 'Comedy',
    'Film & Animation', 'Sports', 'Movies', 'Shows', 'Trailers'
  ];
  let allowedCategories = ['Education', 'Science & Technology'];

  const SOCIAL_MEDIA_DOMAINS = ['facebook.com', 'twitter.com', 'x.com', 'tiktok.com', 'threads.net', 'instagram.com'];

  let channelWhitelist = [];
  let channelBlacklist = [];

  // Cache: videoId -> { result: 'ALLOW'|'BLOCK', data: {...} }
  const cache = {};

  /* ===== GENERAL WEB PAGE CLASSIFICATION ===== */
  const SAFE_DOMAINS = [
    'google.com', 'google.com.vn', 'google.co', 'googleapis.com',
    'stackoverflow.com', 'stackexchange.com',
    'github.com', 'github.io', 'gitlab.com', 'bitbucket.org',
    'wikipedia.org', 'wikimedia.org', 'wiktionary.org',
    'docs.google.com', 'drive.google.com', 'classroom.google.com',
    'notion.so', 'notion.site',
    'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com',
    'gemini.google.com', 'bard.google.com',
    'w3schools.com', 'developer.mozilla.org', 'mdn.mozilla.org', 'devdocs.io',
    'leetcode.com', 'hackerrank.com', 'codepen.io', 'replit.com', 'codesandbox.io',
    'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'skillshare.com',
    'medium.com', 'dev.to', 'hashnode.dev',
    'translate.google.com', 'deepl.com',
    'microsoft.com', 'office.com', 'live.com', 'outlook.com',
    'zoom.us', 'meet.google.com', 'teams.microsoft.com',
    'trello.com', 'asana.com', 'jira.atlassian.com', 'slack.com',
    'figma.com', 'canva.com',
    'localhost', '127.0.0.1'
  ];
  const pageDomainCache = {}; // domain -> 'ALLOW' | 'BLOCK' | 'PENDING'
  let pageClassified = false;
  let pageStrikeTimer = null;
  let pageStrikeReported = false;

  /* ===== INIT ===== */
  fetch(chrome.runtime.getURL('data/channels.json'))
    .then(r => r.json())
    .then(d => { channelWhitelist = d.whitelist || []; channelBlacklist = d.blacklist || []; })
    .catch(() => {});

  chrome.storage.local.get(['focusMode', 'allowedCategories'], (res) => {
    if (chrome.runtime.lastError) return;
    if (res.allowedCategories) allowedCategories = res.allowedCategories;
    if (res.focusMode !== undefined) {
      focusMode = res.focusMode;
      if (focusMode) {
        checkPage();
        checkGeneralWebPage();
      }
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'FOCUS_MODE_CHANGED') {
      focusMode = msg.enabled;
      if (focusMode) {
        checkPage();
        checkGeneralWebPage();
      } else {
        cleanup();
        removePageOverlay();
      }
    }
    // Receive AI classification result for YouTube video
    if (msg.type === 'CLASSIFY_RESULT' && msg.videoId) {
      console.log('[FocusGuard] AI result for', msg.videoId, ':', msg.result, msg.reason);
      cache[msg.videoId] = { result: msg.result, data: cache[msg.videoId]?.data || {} };
      if (msg.videoId === currentVideoId) {
        apply(msg.result, cache[msg.videoId].data);
      }
    }
    // Receive AI classification result for general web page
    if (msg.type === 'CLASSIFY_PAGE_RESULT' && msg.domain) {
      console.log('[FocusGuard] Web AI result for', msg.domain, ':', msg.result, msg.reason);
      pageDomainCache[msg.domain] = msg.result;
      removePageLoadingBadge();
      if (msg.result === 'BLOCK') {
        showPageBlockOverlay(msg.domain, msg.reason);
      }
    }
    // Receive Settings update
    if (msg.type === 'SETTINGS_UPDATED' && msg.allowedCategories) {
      console.log('[FocusGuard] Allowed categories updated:', msg.allowedCategories);
      allowedCategories = msg.allowedCategories;
      // Re-check current video if focus mode is on
      if (focusMode && currentVideoId) {
        // Remove from cache to force re-evaluation
        delete cache[currentVideoId];
        checkPage();
      }
    }
  });

  // YouTube SPA navigation
  document.addEventListener('yt-navigate-finish', () => {
    cleanup();
    currentVideoId = null;
    strikeReported = false; // reset for new page
    setTimeout(checkPage, 1000);
  });

  // Fallback URL observer
  let lastUrl = location.href;
  const obs = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      cleanup();
      currentVideoId = null;
      strikeReported = false; // reset for new page
      setTimeout(checkPage, 1000);
    }
  });
  if (document.body) obs.observe(document.body, { subtree: true, childList: true });

  /* ===== CORE ===== */
  const SOCIAL_SITE_INFO = {
    'facebook.com':  { name: 'Facebook',  icon: '📘', color: '#1877F2' },
    'twitter.com':   { name: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
    'x.com':         { name: 'X (Twitter)', icon: '✖️', color: '#000' },
    'tiktok.com':    { name: 'TikTok',    icon: '🎵', color: '#ff0050' },
    'threads.net':   { name: 'Threads',   icon: '🧵', color: '#000' },
    'instagram.com': { name: 'Instagram', icon: '📸', color: '#E4405F' },
  };

  let socialStrikeReported = false;
  let socialStrikeTimer = null;

  function checkAndBlockSocialMedia() {
    if (!focusMode) return false;
    const hostname = window.location.hostname;
    const matchedDomain = SOCIAL_MEDIA_DOMAINS.find(domain => hostname.includes(domain));
    if (matchedDomain) {
      const info = SOCIAL_SITE_INFO[matchedDomain] || { name: matchedDomain, icon: '🚫', color: '#ef4444' };
      showSocialOverlay(info);
      document.body.style.overflow = 'hidden';
      startSocialStrikeCountdown(info);
      return true;
    }
    return false;
  }

  function startSocialStrikeCountdown(info) {
    if (socialStrikeReported || socialStrikeTimer) return;
    let secondsLeft = 10;
    updateSocialCountdown(secondsLeft);

    socialStrikeTimer = setInterval(() => {
      secondsLeft--;
      updateSocialCountdown(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(socialStrikeTimer);
        socialStrikeTimer = null;
        socialStrikeReported = true;
        chrome.runtime.sendMessage({
          type: 'STRIKE_REPORT',
          videoTitle: info.name,
          reason: `Truy cập ${info.name} trong giờ tập trung (10s+)`
        }, () => { void chrome.runtime.lastError; });
        showSocialStrikeRecorded();
      }
    }, 1000);
  }

  function updateSocialCountdown(seconds) {
    const el = document.getElementById('fg-social-countdown-timer');
    if (el) el.textContent = seconds + 's';
    const bar = document.getElementById('fg-social-progress');
    if (bar) bar.style.width = ((10 - seconds) / 10 * 100) + '%';
  }

  function showSocialStrikeRecorded() {
    const el = document.getElementById('fg-social-countdown');
    if (el) {
      el.innerHTML = '<div class="fg-social-strike-done">🚨 Đã ghi nhận vi phạm!</div>';
    }
  }

  // Social media check only (no re-checking YouTube every second)
  setInterval(() => {
    if (!focusMode) return;
    checkAndBlockSocialMedia();
  }, 3000);

  function getVideoIdFromUrl() {
    return new URLSearchParams(location.search).get('v');
  }

  function checkPage() {
    if (!focusMode) { cleanup(); return; }
    if (location.pathname !== '/watch') { cleanup(); currentVideoId = null; return; }

    const vid = getVideoIdFromUrl();
    if (!vid) return;

    currentVideoId = vid;

    // If already cached, apply immediately
    if (cache[vid]) {
      apply(cache[vid].result, cache[vid].data);
      return;
    }

    // Request data from extractor.js (MAIN world)
    window.dispatchEvent(new CustomEvent('__fg_extract__'));
  }

  // Listen for data from extractor.js (MAIN world)
  window.addEventListener('__fg_data__', (e) => {
    try {
      const d = JSON.parse(e.detail);
      if (!d.videoId || !d.title) return;

      // Only process if this video ID matches what's currently in the URL
      const urlVid = getVideoIdFromUrl();
      if (d.videoId !== urlVid) return;

      // If already cached with valid data, DON'T overwrite
      if (cache[d.videoId] && cache[d.videoId].data && cache[d.videoId].data.title) return;

      console.log('[FocusGuard] Video:', d.title, '| Category:', d.category, '| Channel:', d.author);
      const r = classify(d);
      console.log('[FocusGuard] Tier 1 result:', r);

      if (r === 'UNCERTAIN') {
        // Store data but don't apply yet — send to AI for Tier 2
        cache[d.videoId] = { result: 'PENDING', data: d };
        console.log('[FocusGuard] Tier 1 uncertain → sending to AI (Tier 2)...');
        chrome.runtime.sendMessage({
          type: 'CLASSIFY_VIDEO',
          metadata: d
        }, () => { void chrome.runtime.lastError; });
        // Show a loading overlay while waiting for AI
        showLoadingOverlay();
        return;
      }

      // Cache it
      cache[d.videoId] = { result: r, data: d };

      // Apply only if this is still the current video
      if (d.videoId === currentVideoId) {
        apply(r, d);
      }
    } catch (err) { console.error('[FocusGuard]', err); }
  });

  function classify(d) {
    // Tier 1: Whitelist check
    if (d.channelId && channelWhitelist.some(c => c.id === d.channelId)) return 'ALLOW';
    if (d.author) {
      const a = d.author.toLowerCase();
      if (channelWhitelist.some(c => c.name.toLowerCase() === a)) return 'ALLOW';
    }
    // Tier 1: Blacklist check
    if (d.channelId && channelBlacklist.some(c => c.id === d.channelId)) return 'BLOCK';
    if (d.author) {
      const a = d.author.toLowerCase();
      if (channelBlacklist.some(c => c.name.toLowerCase() === a)) return 'BLOCK';
    }
    // Tier 1: Category check
    if (d.category) {
      if (allowedCategories.includes(d.category)) return 'ALLOW';
      if (BLOCKED_CATEGORIES.includes(d.category)) return 'BLOCK';
    }

    // Category is empty or not in either list → UNCERTAIN (needs AI)
    return 'UNCERTAIN';
  }

  function apply(result, data) {
    if (!focusMode) { cleanup(); return; }
    if (result === 'PENDING') return; // Do nothing, let loading overlay stay

    if (result === 'BLOCK') {
      // Only create overlay if not already showing for this video
      if (currentBlockedVideoId !== currentVideoId) {
        currentBlockedVideoId = currentVideoId;
        showOverlay(data);
        keepPaused();
        startStrikeCountdown(data);
        chrome.runtime.sendMessage({
          type: 'VIDEO_BLOCKED', videoId: currentVideoId,
          category: data?.category || ''
        }, () => { void chrome.runtime.lastError; });
      }
    } else {
      cleanup();
      currentBlockedVideoId = null;
    }
  }

  /* ===== STRIKE COUNTDOWN ===== */
  function startStrikeCountdown(data) {
    // Don't start countdown if already reported for this video
    if (strikeReported) return;
    // Clear any existing countdown
    cancelStrikeCountdown();

    let secondsLeft = 10;
    updateCountdownDisplay(secondsLeft);

    strikeTimer = setInterval(() => {
      secondsLeft--;
      updateCountdownDisplay(secondsLeft);

      if (secondsLeft <= 0) {
        // Time's up — user stayed on blocked video for 10 seconds!
        cancelStrikeCountdown();
        strikeReported = true;
        console.log('[FocusGuard] Strike! User stayed on blocked video for 10 seconds.');
        chrome.runtime.sendMessage({
          type: 'STRIKE_REPORT',
          videoTitle: data?.title || 'Unknown',
          reason: `Blocked video (${data?.category || 'Unknown category'}): stayed 10+ seconds`
        }, () => { void chrome.runtime.lastError; });
        // Update overlay to show strike was recorded
        showStrikeRecordedOnOverlay();
      }
    }, 1000);
  }

  function cancelStrikeCountdown() {
    if (strikeTimer) {
      clearInterval(strikeTimer);
      strikeTimer = null;
    }
    // Remove countdown display from overlay
    const countdownEl = document.getElementById('fg-strike-countdown');
    if (countdownEl) countdownEl.remove();
  }

  function updateCountdownDisplay(seconds) {
    let countdownEl = document.getElementById('fg-strike-countdown');
    if (!countdownEl) {
      // Create countdown element inside the overlay card
      const card = overlayEl ? overlayEl.querySelector('.fg-card') : null;
      if (!card) return;
      countdownEl = document.createElement('div');
      countdownEl.id = 'fg-strike-countdown';
      countdownEl.className = 'fg-countdown';
      card.appendChild(countdownEl);
    }
    countdownEl.innerHTML = `
      <div class="fg-countdown-warning">⚠️ Cảnh báo vi phạm</div>
      <div class="fg-countdown-timer">${seconds}s</div>
      <div class="fg-countdown-hint">Rời trang này trước khi hết giờ để không bị tính vi phạm!</div>
    `;
  }

  function showStrikeRecordedOnOverlay() {
    const countdownEl = document.getElementById('fg-strike-countdown');
    if (countdownEl) {
      countdownEl.innerHTML = `
        <div class="fg-strike-recorded">🚨 Đã ghi nhận vi phạm!</div>
      `;
    }
  }

  /* ===== OVERLAY ===== */
  function showLoadingOverlay() {
    removeOverlay();
    const container = document.querySelector('#movie_player')
      || document.querySelector('.html5-video-player')
      || document.querySelector('#player-container-inner');
    if (!container) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'focusguard-overlay';
    overlayEl.className = 'fg-loading-badge';
    overlayEl.innerHTML = `
      <div class="fg-loading-icon">🤖</div>
      <span class="fg-loading-text">AI đang phân tích...</span>
    `;
    container.style.position = 'relative';
    container.appendChild(overlayEl);
  }

  function showOverlay(data) {
    removeOverlay();
    const container = document.querySelector('#movie_player')
      || document.querySelector('.html5-video-player')
      || document.querySelector('#player-container-inner');
    if (!container) return;

    const cat = esc(data?.category || 'Giải trí');

    overlayEl = document.createElement('div');
    overlayEl.id = 'focusguard-overlay';
    overlayEl.innerHTML = `
      <div class="fg-backdrop"></div>
      <div class="fg-card">
        <div class="fg-icon">🛡️</div>
        <h2 class="fg-heading">Video Bị Chặn</h2>
        <div class="fg-divider"></div>
        <div class="fg-meta">
          <span class="fg-tag">${cat}</span>
        </div>
        <p class="fg-msg">Video này thuộc danh mục giải trí và bị chặn trong giờ học tập.<br/>Hãy tập trung vào việc học! 📚</p>
      </div>`;
    container.style.position = 'relative';
    container.appendChild(overlayEl);
  }

  function showSocialOverlay(info) {
    if (document.getElementById('focusguard-social-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'focusguard-social-overlay';
    overlay.innerHTML = `
      <div class="fg-social-bg"></div>
      <div class="fg-social-card">
        <div class="fg-social-icon" style="background:${info.color}">${info.icon}</div>
        <h2 class="fg-social-title">${info.name} đã bị chặn</h2>
        <div class="fg-social-divider"></div>
        <p class="fg-social-desc">
          Trang này thuộc danh mục <strong>Mạng xã hội</strong> và bị khóa trong giờ tập trung.<br/>
          Hãy quay lại học tập! 📚
        </p>
        <div class="fg-social-countdown" id="fg-social-countdown">
          <div class="fg-social-countdown-label">⚠️ Cảnh báo vi phạm</div>
          <div class="fg-social-progress-track">
            <div class="fg-social-progress-bar" id="fg-social-progress"></div>
          </div>
          <div class="fg-social-countdown-row">
            <span>Rời trang ngay!</span>
            <span class="fg-social-countdown-num" id="fg-social-countdown-timer">10s</span>
          </div>
        </div>
        <div class="fg-social-footer">
          <span class="fg-social-badge">🛡️ Focus Guard</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    cancelStrikeCountdown();
    // Remove video overlay
    const el = document.getElementById('focusguard-overlay');
    if (el) el.remove();
    overlayEl = null;
    // Remove social overlay
    const socialEl = document.getElementById('focusguard-social-overlay');
    if (socialEl) socialEl.remove();
    // Reset social strike state
    if (socialStrikeTimer) { clearInterval(socialStrikeTimer); socialStrikeTimer = null; }
    socialStrikeReported = false;
    document.body.style.overflow = '';
  }

  function keepPaused() {
    clearInterval(pauseInterval);
    const muteAndPause = () => {
      if (!focusMode || location.pathname !== '/watch') { clearInterval(pauseInterval); return; }
      const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (v) { v.pause(); v.muted = true; }
    };
    muteAndPause();
    pauseInterval = setInterval(muteAndPause, 500);
  }

  function cleanup() {
    removeOverlay();
    cancelStrikeCountdown();
    currentBlockedVideoId = null;
    if (pauseInterval) { clearInterval(pauseInterval); pauseInterval = null; }
    const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (v) v.muted = false;
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ═══════════════════════════════════════════════════════════
     GENERAL WEB PAGE CLASSIFICATION (non-YouTube, non-Social)
     ═══════════════════════════════════════════════════════════ */

  function isYouTube() {
    return location.hostname.includes('youtube.com');
  }

  function isSocialMediaSite() {
    return SOCIAL_MEDIA_DOMAINS.some(d => location.hostname.includes(d));
  }

  function isDomainSafe(hostname) {
    return SAFE_DOMAINS.some(safe => {
      // Match exact or subdomain (e.g. 'docs.google.com' matches 'google.com')
      return hostname === safe || hostname.endsWith('.' + safe);
    });
  }

  function extractPageMetadata() {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return el ? el.getAttribute('content') || '' : '';
    };
    return {
      url: location.href,
      domain: location.hostname,
      title: document.title || '',
      description: getMeta('description'),
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      keywords: getMeta('keywords'),
      h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 100) || ''
    };
  }

  function checkGeneralWebPage() {
    if (!focusMode) return;
    if (isYouTube() || isSocialMediaSite()) return; // handled separately
    if (pageClassified) return; // already checked this page

    const hostname = location.hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return;

    // Check extension pages
    if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:' ||
        location.protocol === 'edge:' || location.protocol === 'about:') return;

    // Check safe whitelist
    if (isDomainSafe(hostname)) {
      console.log('[FocusGuard] Safe domain:', hostname);
      pageClassified = true;
      return;
    }

    // Check domain cache
    if (pageDomainCache[hostname]) {
      pageClassified = true;
      if (pageDomainCache[hostname] === 'BLOCK') {
        showPageBlockOverlay(hostname, 'Cached result');
      }
      return;
    }

    // Need AI classification — show loading badge, send to background
    pageClassified = true;
    pageDomainCache[hostname] = 'PENDING';
    showPageLoadingBadge();

    // Wait for DOM to have metadata (delay a bit)
    setTimeout(() => {
      const metadata = extractPageMetadata();
      console.log('[FocusGuard] Sending page for AI classification:', hostname, metadata.title);
      chrome.runtime.sendMessage({
        type: 'CLASSIFY_PAGE',
        metadata
      }, () => { void chrome.runtime.lastError; });
    }, 2000);
  }

  function showPageLoadingBadge() {
    if (document.getElementById('focusguard-page-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'focusguard-page-badge';
    badge.className = 'fg-page-loading-badge';
    badge.innerHTML = `
      <span class="fg-page-badge-icon">🛡️</span>
      <span class="fg-page-badge-text">AI đang phân tích...</span>
    `;
    document.documentElement.appendChild(badge);
  }

  function removePageLoadingBadge() {
    const el = document.getElementById('focusguard-page-badge');
    if (el) el.remove();
  }

  function showPageBlockOverlay(domain, reason) {
    if (document.getElementById('focusguard-page-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'focusguard-page-overlay';
    overlay.innerHTML = `
      <div class="fg-social-bg"></div>
      <div class="fg-social-card">
        <div class="fg-social-icon" style="background:#ef4444">🚫</div>
        <h2 class="fg-social-title">${esc(domain)}</h2>
        <div class="fg-social-divider"></div>
        <p class="fg-social-desc">
          AI đã phân tích trang web này và xác định nó <strong>không liên quan đến học tập</strong>.<br/>
          <em style="color:#64748b;font-size:13px;">${esc(reason || '')}</em>
        </p>
        <div class="fg-social-countdown" id="fg-page-countdown">
          <div class="fg-social-countdown-label">⚠️ Cảnh báo vi phạm</div>
          <div class="fg-social-progress-track">
            <div class="fg-social-progress-bar" id="fg-page-progress"></div>
          </div>
          <div class="fg-social-countdown-row">
            <span>Rời trang ngay!</span>
            <span class="fg-social-countdown-num" id="fg-page-countdown-timer">10s</span>
          </div>
        </div>
        <div class="fg-social-footer">
          <span class="fg-social-badge">🛡️ Focus Guard — AI Classification</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Start strike countdown
    startPageStrikeCountdown(domain);
  }

  function startPageStrikeCountdown(domain) {
    if (pageStrikeReported || pageStrikeTimer) return;
    let secondsLeft = 10;

    pageStrikeTimer = setInterval(() => {
      secondsLeft--;
      const timerEl = document.getElementById('fg-page-countdown-timer');
      if (timerEl) timerEl.textContent = secondsLeft + 's';
      const barEl = document.getElementById('fg-page-progress');
      if (barEl) barEl.style.width = ((10 - secondsLeft) / 10 * 100) + '%';

      if (secondsLeft <= 0) {
        clearInterval(pageStrikeTimer);
        pageStrikeTimer = null;
        pageStrikeReported = true;
        chrome.runtime.sendMessage({
          type: 'STRIKE_REPORT',
          videoTitle: domain,
          reason: `Truy cập ${domain} — trang không liên quan học tập (10s+)`
        }, () => { void chrome.runtime.lastError; });
        const cdEl = document.getElementById('fg-page-countdown');
        if (cdEl) {
          cdEl.innerHTML = '<div class="fg-social-strike-done">🚨 Đã ghi nhận vi phạm!</div>';
        }
      }
    }, 1000);
  }

  function removePageOverlay() {
    removePageLoadingBadge();
    const el = document.getElementById('focusguard-page-overlay');
    if (el) el.remove();
    if (pageStrikeTimer) { clearInterval(pageStrikeTimer); pageStrikeTimer = null; }
    pageStrikeReported = false;
    pageClassified = false;
    document.body.style.overflow = '';
  }

  // ── Trigger general page check on DOM ready ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (focusMode) checkGeneralWebPage();
    });
  } else {
    setTimeout(() => {
      if (focusMode) checkGeneralWebPage();
    }, 500);
  }

})();
