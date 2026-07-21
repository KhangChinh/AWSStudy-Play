import React from 'react';
import { assetUrl } from '../services/cosmeticServices';

const escapeAttribute = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const BackgroundCssThumbnail = ({ item, cssPath, label = '', className = '' }) => {
  const resolvedCssPath = cssPath || item?.assets?.css;
  const resolvedLabel = label || item?.name || '';
  if (!resolvedCssPath) return <span className={`background-css-fallback ${className}`} />;

  const stylesheetUrl = escapeAttribute(assetUrl(resolvedCssPath));
  const title = escapeAttribute(resolvedLabel);
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${stylesheetUrl}"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#1e293b}.os-desktop{position:relative;width:100%;height:100%;overflow:hidden;background:var(--desktop-user-background,#1e293b);background-position:center!important;background-size:cover!important}.desktop-line-bg{position:absolute;inset:0}</style></head><body><div class="os-desktop"><div class="desktop-line-bg"></div></div></body></html>`;

  return (
    <iframe
      className={`background-css-iframe ${className}`}
      title={title || 'Background preview'}
      srcDoc={srcDoc}
      sandbox=""
      tabIndex="-1"
      aria-hidden="true"
      style={{ border: 0, display: 'block', pointerEvents: 'none' }}
    />
  );
};

export default BackgroundCssThumbnail;