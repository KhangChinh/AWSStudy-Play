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
    
    // The crop area is a 200x200 square in the center of the container
    const cropSize = 300;
    canvas.width = cropSize;
    canvas.height = cropSize;

    const container = containerRef.current.getBoundingClientRect();
    const rect = img.getBoundingClientRect();

    // Scale factor between natural image and rendered image (without CSS zoom)
    // rect.width is (naturalWidth * zoom / someFactor) maybe? 
    // Actually, simpler:
    const scaleX = img.naturalWidth / (rect.width / zoom);
    const scaleY = img.naturalHeight / (rect.height / zoom);

    // Calculate source coordinates in natural pixels
    const mouseX = (container.width / 2 - cropSize / 2) - rect.left;
    const mouseY = (container.height / 2 - cropSize / 2) - rect.top;

    const sx = mouseX * (img.naturalWidth / rect.width);
    const sy = mouseY * (img.naturalHeight / rect.height);
    const sw = (cropSize * img.naturalWidth) / rect.width;
    const sh = (cropSize * img.naturalHeight) / rect.height;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cropSize, cropSize);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleApply = async () => {
    const blob = await getCroppedImg();
    onCrop(blob);
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
