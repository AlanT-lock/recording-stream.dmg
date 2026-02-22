/**
 * Flou autour du visage via @mediapipe/selfie_segmentation
 * Composition correcte : fond flouté + personne nette
 */

import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747';

let segmenter = null;
let lastResults = null;
let sendInProgress = false;
let segmentationLoopId = null;
let blurTempCanvas = null;
let maskCanvas = null;

export async function initSegmenter() {
  if (segmenter) return segmenter;
  segmenter = new SelfieSegmentation({
    locateFile: (file) => `${CDN_BASE}/${file}`
  });
  segmenter.setOptions({ modelSelection: 0 });
  segmenter.onResults((results) => {
    lastResults = results;
  });
  await segmenter.initialize();
  return segmenter;
}

export function getSegmenter() {
  return segmenter;
}

export function startSegmentationLoop(video) {
  if (!segmenter || !video) return;
  function tick() {
    if (sendInProgress || !video.videoWidth) {
      segmentationLoopId = requestAnimationFrame(tick);
      return;
    }
    sendInProgress = true;
    segmenter.send({ image: video }).finally(() => {
      sendInProgress = false;
      segmentationLoopId = requestAnimationFrame(tick);
    });
  }
  if (segmentationLoopId) cancelAnimationFrame(segmentationLoopId);
  tick();
}

export function stopSegmentationLoop() {
  if (segmentationLoopId) {
    cancelAnimationFrame(segmentationLoopId);
    segmentationLoopId = null;
  }
}

export function getBlurIntensity() {
  const el = document.getElementById('blurIntensity');
  return el ? Math.max(10, Math.min(100, parseInt(el.value, 10) || 50)) : 50;
}

function blurRadiusFromPercent(percent) {
  return Math.round(1 + (percent / 100) * 24);
}

/**
 * Dessine la vidéo avec flou du fond autour du visage.
 * 1. Fond flouté en arrière-plan
 * 2. Personne nette par-dessus (via masque)
 */
export function applyBlur(video, ctx, width, height, intensityPercent) {
  if (!segmenter || !video?.videoWidth) return false;
  if (!lastResults?.segmentationMask) return false;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const mask = lastResults.segmentationMask;
  const img = lastResults.image;

  const percent = intensityPercent ?? getBlurIntensity();
  const blurPx = blurRadiusFromPercent(percent);

  if (!blurTempCanvas || blurTempCanvas.width !== vw || blurTempCanvas.height !== vh) {
    blurTempCanvas = document.createElement('canvas');
    blurTempCanvas.width = vw;
    blurTempCanvas.height = vh;
  }
  if (!maskCanvas || maskCanvas.width !== vw || maskCanvas.height !== vh) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.width = vw;
    maskCanvas.height = vh;
  }
  const tempCtx = blurTempCanvas.getContext('2d', { alpha: false, willReadFrequently: false });
  const maskCtx = maskCanvas.getContext('2d', { alpha: true, willReadFrequently: false });

  tempCtx.save();
  tempCtx.filter = `blur(${blurPx}px)`;
  tempCtx.drawImage(video, 0, 0, vw, vh);
  tempCtx.restore();

  maskCtx.clearRect(0, 0, vw, vh);
  maskCtx.drawImage(mask, 0, 0, vw, vh);
  const maskData = maskCtx.getImageData(0, 0, vw, vh);

  maskCtx.clearRect(0, 0, vw, vh);
  maskCtx.drawImage(img, 0, 0, vw, vh);
  const imgData = maskCtx.getImageData(0, 0, vw, vh);

  const blurredData = tempCtx.getImageData(0, 0, vw, vh);
  const outData = new ImageData(vw, vh);

  for (let i = 0; i < vw * vh; i++) {
    const mi = i * 4;
    const m = maskData.data[mi] / 255;
    let t = Math.max(0, Math.min(1, (m - 0.18) / 0.42));
    t = t * t * (3 - 2 * t);

    outData.data[mi] = imgData.data[mi] * t + blurredData.data[mi] * (1 - t);
    outData.data[mi + 1] = imgData.data[mi + 1] * t + blurredData.data[mi + 1] * (1 - t);
    outData.data[mi + 2] = imgData.data[mi + 2] * t + blurredData.data[mi + 2] * (1 - t);
    outData.data[mi + 3] = 255;
  }

  maskCtx.putImageData(outData, 0, 0);

  const scale = Math.max(width / vw, height / vh);
  const scaledW = vw * scale;
  const scaledH = vh * scale;
  const x = (width - scaledW) / 2;
  const y = (height - scaledH) / 2;
  ctx.drawImage(maskCanvas, 0, 0, vw, vh, x, y, scaledW, scaledH);
  return true;
}
