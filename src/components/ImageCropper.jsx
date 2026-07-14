import React, { useState, useCallback, useRef, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline, removeOutline } from 'ionicons/icons';
import './ImageCropper.scss';

const ImageCropper = ({ image, onCrop, onCancel, t }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  const getCroppedImg = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = img.getBoundingClientRect();
    const displayedCropSize = Math.min(300, containerRect.width - 24, containerRect.height - 24);
    const cropLeft = containerRect.left + (containerRect.width - displayedCropSize) / 2;
    const cropTop = containerRect.top + (containerRect.height - displayedCropSize) / 2;

    // Both rectangles use viewport coordinates. Mixing relative and viewport
    // coordinates here previously sampled outside the image and produced black JPEGs.
    const sx = (cropLeft - imageRect.left) * (img.naturalWidth / imageRect.width);
    const sy = (cropTop - imageRect.top) * (img.naturalHeight / imageRect.height);
    const sw = displayedCropSize * (img.naturalWidth / imageRect.width);
    const sh = displayedCropSize * (img.naturalHeight / imageRect.height);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleApply = async () => {
    const blob = await getCroppedImg();
    if (blob) onCrop(blob);
  };

  return (
    <div className="cropper-modal-overlay">
      <div className="cropper-container">
        <div className="cropper-header">
          <h3>{t('profile.crop_image') || 'Crop Avatar'}</h3>
          <p className="crop-hint">{t('profile.crop_hint') || 'Drag to position, use slider to zoom'}</p>
        </div>
        
        <div className="cropper-view-area" ref={containerRef}>
          <div 
            className="crop-image-wrapper"
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img 
              ref={imageRef}
              src={image} 
              alt="To crop" 
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              }}
            />
          </div>
          <div className="crop-overlay">
            <div className="crop-hole"></div>
          </div>
        </div>

        <div className="cropper-controls">
          <div className="zoom-section">
            <label className="zoom-label">{t('profile.zoom') || 'Zoom'}</label>
            <div className="zoom-slider-wrap">
              <IonIcon icon={removeOutline} />
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
              />
              <IonIcon icon={addOutline} />
            </div>
          </div>
          <div className="cropper-actions">
            <button className="btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
            <button className="btn-apply" onClick={handleApply}>{t('common.apply')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
