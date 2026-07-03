// ==========================================
// Face Tracker — MediaPipe Face Detection (ES Module)
// Ported from Block Web & App Feature → AWSStudy-Play
// Tracks if user is sitting in front of screen
// + Liveness Detection via micro-movement analysis
// ==========================================

const AFK_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút không thấy mặt → AFK
const DETECT_INTERVAL_MS = 2000;       // check mỗi 2 giây

// ── Liveness config ──
const MOVEMENT_BUFFER_SIZE = 15;        // 15 samples (~30s at 2s interval)
const MOVEMENT_VARIANCE_THRESHOLD = 0.5; // Ngưỡng variance tối thiểu (pixel²)
const SPOOF_STRIKES_NEEDED = 3;         // 3 lần check liên tục bất thường → spoof

let faceDetector = null;
let videoStream = null;
let videoEl = null;
let detectInterval = null;
let lastFaceDetectedAt = 0;
let isTracking = false;
let isPaused = false;   // paused during AI classification to reduce load

// ── Liveness state ──
let movementBuffer = [];   // [{x, y}, ...] — face center positions
let spoofFailCount = 0;    // consecutive fails
let livenessConfirmed = false;

// Callbacks
let onStatusUpdate = null; // (status: 'tracking' | 'warning' | 'afk' | 'spoof', afkElapsed: number) => void
let onAfkTimeout = null;   // () => void
let onSpoofDetected = null; // () => void

async function initMediaPipe() {
  if (faceDetector) return;
  console.log('[FaceTracker] Loading MediaPipe...');

  try {
    const { FaceDetector, FilesetResolver } = await import(
      /* webpackIgnore: true */
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs'
    );

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU'
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5
    });

    console.log('[FaceTracker] MediaPipe loaded successfully (GPU)!');
  } catch (err) {
    console.warn('[FaceTracker] GPU failed, trying CPU fallback...', err.message);
    try {
      const { FaceDetector, FilesetResolver } = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs'
      );
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5
      });
      console.log('[FaceTracker] MediaPipe loaded (CPU fallback).');
    } catch (err2) {
      console.error('[FaceTracker] MediaPipe completely failed:', err2);
      throw err2;
    }
  }
}

// ── Liveness: calculate variance of face positions ──
function calcVariance(buffer) {
  if (buffer.length < 5) return Infinity; // not enough data yet

  const avgX = buffer.reduce((s, p) => s + p.x, 0) / buffer.length;
  const avgY = buffer.reduce((s, p) => s + p.y, 0) / buffer.length;

  const varX = buffer.reduce((s, p) => s + (p.x - avgX) ** 2, 0) / buffer.length;
  const varY = buffer.reduce((s, p) => s + (p.y - avgY) ** 2, 0) / buffer.length;

  return varX + varY;
}

function checkLiveness() {
  const variance = calcVariance(movementBuffer);

  if (variance < MOVEMENT_VARIANCE_THRESHOLD) {
    // Face is suspiciously still
    spoofFailCount++;
    console.warn(`[FaceTracker] Liveness check FAIL #${spoofFailCount} — variance: ${variance.toFixed(4)} (threshold: ${MOVEMENT_VARIANCE_THRESHOLD})`);
    livenessConfirmed = false;

    if (spoofFailCount >= SPOOF_STRIKES_NEEDED) {
      console.error('[FaceTracker] 🚨 SPOOF DETECTED — Face is static (photo/image suspected)');
      if (onSpoofDetected) onSpoofDetected();
      spoofFailCount = 0; // reset after reporting
      movementBuffer = []; // reset buffer
    }

    return false;
  } else {
    // Normal movement detected
    if (spoofFailCount > 0) {
      console.log(`[FaceTracker] ✅ Liveness restored — variance: ${variance.toFixed(4)}`);
    }
    spoofFailCount = 0;
    livenessConfirmed = true;
    return true;
  }
}

function detectFace() {
  if (isPaused) return; // skip detection while AI is classifying
  if (!faceDetector || !videoEl || videoEl.readyState < 2) return;

  try {
    const detections = faceDetector.detect(videoEl);
    const now = Date.now();

    if (detections.detections && detections.detections.length > 0) {
      // Face found!
      lastFaceDetectedAt = now;

      // ── Collect face center for liveness ──
      const det = detections.detections[0];
      const bb = det.boundingBox;
      if (bb) {
        const cx = bb.originX + bb.width / 2;
        const cy = bb.originY + bb.height / 2;
        movementBuffer.push({ x: cx, y: cy });

        // Keep buffer capped
        if (movementBuffer.length > MOVEMENT_BUFFER_SIZE) {
          movementBuffer.shift();
        }

        // Check liveness when buffer is full
        if (movementBuffer.length >= MOVEMENT_BUFFER_SIZE) {
          const isLive = checkLiveness();
          if (!isLive && spoofFailCount > 0) {
            if (onStatusUpdate) onStatusUpdate('spoof', 0);
            return;
          }
        }
      }

      if (onStatusUpdate) onStatusUpdate('tracking', 0);
    } else {
      // No face
      movementBuffer = []; // reset when face lost
      spoofFailCount = 0;
      const elapsed = now - lastFaceDetectedAt;
      if (elapsed >= AFK_TIMEOUT_MS) {
        console.log('[FaceTracker] AFK timeout! User away for 5+ minutes.');
        if (onAfkTimeout) onAfkTimeout();
        stopTracking();
      } else {
        if (onStatusUpdate) onStatusUpdate('warning', elapsed);
      }
    }
  } catch (err) {
    console.error('[FaceTracker] Detection error:', err);
  }
}

export async function startTracking(videoElement, callbacks) {
  if (isTracking) return;
  isTracking = true;

  onStatusUpdate = callbacks.onStatusUpdate || null;
  onAfkTimeout = callbacks.onAfkTimeout || null;
  onSpoofDetected = callbacks.onSpoofDetected || null;

  // Reset liveness state
  movementBuffer = [];
  spoofFailCount = 0;
  livenessConfirmed = false;

  try {
    await initMediaPipe();

    // Start camera
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' }
    });
    videoEl = videoElement;
    videoEl.srcObject = videoStream;
    await videoEl.play();
    console.log('[FaceTracker] Camera started.');

    lastFaceDetectedAt = Date.now();
    detectInterval = setInterval(detectFace, DETECT_INTERVAL_MS);
    console.log('[FaceTracker] Tracking started (with liveness detection).');
  } catch (err) {
    console.error('[FaceTracker] Could not start tracking:', err);
    isTracking = false;
    if (onStatusUpdate) onStatusUpdate('error', 0);
  }
}

export function stopTracking() {
  isTracking = false;
  isPaused = false;
  clearInterval(detectInterval);
  detectInterval = null;

  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
  if (videoEl) {
    videoEl.srcObject = null;
    videoEl = null;
  }

  faceDetector = null; // force re-init next time
  onStatusUpdate = null;
  onAfkTimeout = null;
  onSpoofDetected = null;

  // Reset liveness
  movementBuffer = [];
  spoofFailCount = 0;
  livenessConfirmed = false;

  console.log('[FaceTracker] Tracking stopped.');
}

export function getIsTracking() {
  return isTracking;
}

export function getLivenessStatus() {
  return { livenessConfirmed, spoofFailCount };
}

/**
 * Pause face detection temporarily (e.g. during AI classification).
 * Timer and tracking state remain active — only detection calls are skipped.
 */
export function pauseTracking() {
  if (!isTracking || isPaused) return;
  isPaused = true;
  console.log('[FaceTracker] ⏸ Detection paused (AI classifying)');
}

/**
 * Resume face detection after AI finishes.
 */
export function resumeTracking() {
  if (!isTracking || !isPaused) return;
  isPaused = false;
  // Refresh lastFaceDetectedAt to avoid false AFK trigger after pause
  lastFaceDetectedAt = Date.now();
  console.log('[FaceTracker] ▶ Detection resumed');
}

/**
 * Re-attach the existing camera stream to a new video element.
 * Called when React re-mounts the <video> after panel toggle.
 */
export async function reattachVideo(newVideoEl) {
  if (!isTracking || !videoStream || !newVideoEl) return false;

  try {
    videoEl = newVideoEl;
    videoEl.srcObject = videoStream;
    await videoEl.play();
    console.log('[FaceTracker] Stream re-attached to new video element.');
    return true;
  } catch (err) {
    console.error('[FaceTracker] Failed to re-attach video:', err);
    return false;
  }
}
