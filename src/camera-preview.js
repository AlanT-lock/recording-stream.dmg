/**
 * Aperçu de la caméra avant enregistrement
 * Affiche la webcam (avec flou optionnel)
 */

import { initSegmenter, applyBlur, startSegmentationLoop, stopSegmentationLoop } from './background-processor.js';

let previewStream = null;
let drawPreviewId = null;
let _stopPreview = () => {};

export function initCameraPreview() {
  const activateBtn = document.getElementById('activatePreviewBtn');
  const placeholder = document.getElementById('cameraPreviewPlaceholder');
  const video = document.getElementById('cameraPreviewVideo');
  const composite = document.getElementById('cameraPreviewComposite');
  const container = document.getElementById('cameraPreviewContainer');
  const mirrorCamEl = document.getElementById('mirrorCam');
  const blurEl = document.getElementById('blurBackground');
  const blurIntensityEl = document.getElementById('blurIntensity');
  const blurIntensityValue = document.getElementById('blurIntensityValue');

  if (!activateBtn || !placeholder || !video || !container) return;

  blurIntensityEl?.addEventListener('input', () => {
    if (blurIntensityValue) blurIntensityValue.textContent = `${blurIntensityEl.value}%`;
  });
  if (blurIntensityValue && blurIntensityEl) blurIntensityValue.textContent = `${blurIntensityEl.value}%`;

  function useBlur() {
    return blurEl?.checked ?? false;
  }

  function drawVideoFrame() {
    if (!video.videoWidth) return;
    const blur = useBlur();

    if (blur && composite) {
      const rect = container.getBoundingClientRect();
      composite.width = rect.width;
      composite.height = rect.height;
      const ctx = composite.getContext('2d', { alpha: false, willReadFrequently: false });
      const ok = applyBlur(video, ctx, composite.width, composite.height);
      if (ok) {
        if (mirrorCamEl?.checked) {
          const temp = document.createElement('canvas');
          temp.width = composite.width;
          temp.height = composite.height;
          temp.getContext('2d').drawImage(composite, 0, 0);
          ctx.clearRect(0, 0, composite.width, composite.height);
          ctx.save();
          ctx.translate(composite.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(temp, 0, 0);
          ctx.restore();
        }
        composite.hidden = false;
        video.hidden = true;
      } else {
        composite.hidden = true;
        video.hidden = false;
      }
    } else {
      if (composite) composite.hidden = true;
      video.hidden = false;
    }
    drawPreviewId = requestAnimationFrame(drawVideoFrame);
  }

  activateBtn.addEventListener('click', async () => {
    try {
      activateBtn.disabled = true;
      activateBtn.textContent = 'Chargement...';
      previewStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      video.srcObject = previewStream;
      video.hidden = false;
      placeholder.hidden = true;
      video.style.transform = mirrorCamEl?.checked ? 'scaleX(-1)' : 'none';
      await video.play();

      if (useBlur()) {
        activateBtn.textContent = 'Chargement du flou...';
        try {
          await initSegmenter();
          startSegmentationLoop(video);
        } catch (e) {
          console.warn('Flou non disponible:', e);
        }
      }

      activateBtn.textContent = 'Aperçu actif';
      drawPreviewId = requestAnimationFrame(drawVideoFrame);
    } catch (err) {
      activateBtn.disabled = false;
      activateBtn.textContent = 'Activer l\'aperçu de la caméra';
      console.error(err);
    }
  });

  mirrorCamEl?.addEventListener('change', () => {
    video.style.transform = mirrorCamEl.checked ? 'scaleX(-1)' : 'none';
  });
  blurEl?.addEventListener('change', () => {
    if (blurEl.checked && previewStream) {
      initSegmenter().then(() => startSegmentationLoop(video)).catch(() => {});
    }
  });

  _stopPreview = function stopPreview() {
    stopSegmentationLoop();
    if (drawPreviewId) {
      cancelAnimationFrame(drawPreviewId);
      drawPreviewId = null;
    }
    if (previewStream) {
      previewStream.getTracks().forEach(t => t.stop());
      previewStream = null;
    }
    video.srcObject = null;
    video.hidden = true;
    if (composite) composite.hidden = true;
    placeholder.hidden = false;
    activateBtn.disabled = false;
    activateBtn.textContent = 'Activer l\'aperçu de la caméra';
  };

  return { stopPreview: _stopPreview };
}

export function stopPreview() {
  _stopPreview();
}

export function getPastilleRatio() {
  const el = document.getElementById('pastilleSize');
  return parseFloat(el?.value || '0.2');
}
