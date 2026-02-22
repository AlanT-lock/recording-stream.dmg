/**
 * Logique d'enregistrement écran + webcam
 * Support des toggles : micro, caméra, écran
 * Options : miroir, fond virtuel
 */

import { initSegmenter, getSegmenter, applyBlur, startSegmentationLoop, stopSegmentationLoop } from './background-processor.js';
import { getPastilleRatio, stopPreview } from './camera-preview.js';

let screenStream = null;
let webcamStream = null;
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let drawIntervalId = null;
let screenVideoEl = null;
let webcamVideoEl = null;
let audioCtx = null;
let gainNode = null;
let micEnabled = true;
let cameraEnabled = true;
let screenEnabled = true;

export function initRecorder(callbacks) {
  const { onStatus, onRecordingComplete, onBeforeStart, onRecordingEnd } = callbacks;

  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const previewCanvas = document.getElementById('previewCanvas');
  const statusEl = document.getElementById('status');

  function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className = 'status' + (type ? ` ${type}` : '');
  }

  async function startRecording() {
    try {
      onBeforeStart?.();
      micEnabled = true;
      cameraEnabled = true;
      screenEnabled = true;
      setStatus('Choisissez la fenêtre de votre présentation (ex. Gamma) pour éviter que la PiP apparaisse dans l\'enregistrement');

      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'window'
        },
        audio: false,
        selfBrowserSurface: 'exclude'
      });

      setStatus('Demande d\'accès à la webcam...');

      stopPreview?.();

      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });

      setStatus('Demande d\'accès au micro...');

      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mirrorCam = document.getElementById('mirrorCam')?.checked ?? true;
      const useBlur = document.getElementById('blurBackground')?.checked ?? false;

      if (useBlur) {
        setStatus('Chargement du modèle de flou...');
        try {
          await initSegmenter();
        } catch (e) {
          console.warn('Fond virtuel non disponible:', e);
        }
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      const settings = screenTrack.getSettings();
      const width = settings.width || 1920;
      const height = settings.height || 1080;

      previewCanvas.width = width;
      previewCanvas.height = height;
      previewCanvas.hidden = false;
      previewPlaceholder.hidden = true;

      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      screenVideo.autoplay = true;
      screenVideo.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
      document.body.appendChild(screenVideo);

      const webcamVideo = document.createElement('video');
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      webcamVideo.playsInline = true;
      webcamVideo.autoplay = true;
      webcamVideo.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
      document.body.appendChild(webcamVideo);

      await Promise.all([screenVideo.play(), webcamVideo.play()]);

      screenVideoEl = screenVideo;
      webcamVideoEl = webcamVideo;

      if (useBlur && getSegmenter()) {
        startSegmentationLoop(webcamVideo);
      }

      const ctx = previewCanvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false
      });
      const overlayRatio = getPastilleRatio?.() ?? 0.2;
      const overlaySizePx = Math.floor(Math.min(width, height) * overlayRatio);
      const padding = Math.floor(overlaySizePx * 0.1);
      const overlayX = width - overlaySizePx - padding;
      const overlayY = padding;
      const overlayCenterX = overlayX + overlaySizePx / 2;
      const overlayCenterY = overlayY + overlaySizePx / 2;
      const overlayRadius = overlaySizePx / 2;

      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = overlaySizePx;
      overlayCanvas.height = overlaySizePx;
      const overlayCtx = overlayCanvas.getContext('2d', { alpha: false, willReadFrequently: false });

      let frameCount = 0;

      function drawWebcamToOverlay() {
        if (useBlur) {
          const ok = applyBlur(webcamVideo, overlayCtx, overlaySizePx, overlaySizePx);
          if (!ok) overlayCtx.drawImage(webcamVideo, 0, 0, overlaySizePx, overlaySizePx);
        } else {
          overlayCtx.save();
          if (mirrorCam) {
            overlayCtx.translate(overlaySizePx, 0);
            overlayCtx.scale(-1, 1);
          }
          overlayCtx.drawImage(webcamVideo, 0, 0, overlaySizePx, overlaySizePx);
          overlayCtx.restore();
        }
        if (mirrorCam && useBlur) {
          const temp = document.createElement('canvas');
          temp.width = overlaySizePx;
          temp.height = overlaySizePx;
          const tctx = temp.getContext('2d');
          tctx.translate(overlaySizePx, 0);
          tctx.scale(-1, 1);
          tctx.drawImage(overlayCanvas, 0, 0);
          overlayCtx.save();
          overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
          overlayCtx.drawImage(temp, 0, 0);
          overlayCtx.restore();
        }
      }

      function drawWebcamFullScreen() {
        const vw = webcamVideo.videoWidth;
        const vh = webcamVideo.videoHeight;
        const scale = Math.max(width / vw, height / vh);
        const sw = vw * scale;
        const sh = vh * scale;
        const sx = (width - sw) / 2;
        const sy = (height - sh) / 2;
        ctx.save();
        if (mirrorCam) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(webcamVideo, 0, 0, vw, vh, -sx - sw, sy, sw, sh);
        } else {
          ctx.drawImage(webcamVideo, 0, 0, vw, vh, sx, sy, sw, sh);
        }
        ctx.restore();
      }

      function drawFrame() {
        frameCount++;
        if (screenEnabled && !screenVideo.videoWidth) return;
        if (!screenEnabled && !cameraEnabled) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          return;
        }
        if (!screenEnabled && !webcamVideo.videoWidth) return;

        if (screenEnabled) {
          ctx.drawImage(screenVideo, 0, 0, width, height);
          if (cameraEnabled && webcamVideo.videoWidth > 0) {
            drawWebcamToOverlay();
            ctx.save();
            ctx.beginPath();
            ctx.arc(overlayCenterX, overlayCenterY, overlayRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(overlayCanvas, overlayX, overlayY, overlaySizePx, overlaySizePx);
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(overlayCenterX, overlayCenterY, overlayRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          if (webcamVideo.videoWidth > 0) {
            if (useBlur) {
              const temp = document.createElement('canvas');
              temp.width = width;
              temp.height = height;
              const tctx = temp.getContext('2d');
              if (applyBlur(webcamVideo, tctx, width, height)) {
                ctx.save();
                if (mirrorCam) {
                  ctx.translate(width, 0);
                  ctx.scale(-1, 1);
                }
                ctx.drawImage(temp, 0, 0);
                ctx.restore();
              } else {
                drawWebcamFullScreen();
              }
            } else {
              drawWebcamFullScreen();
            }
          }
        }
      }

      const FPS = 30;
      drawFrame();
      drawIntervalId = setInterval(drawFrame, 1000 / FPS);

      const canvasStream = previewCanvas.captureStream(30);

      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1;
      const source = audioCtx.createMediaStreamSource(micStream);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(gainNode);
      gainNode.connect(dest);
      dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

      recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 5000000,
        audioBitsPerSecond: 128000
      });

      const startTime = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const duration = (Date.now() - startTime) / 1000;
        const blob = new Blob(recordedChunks, { type: mimeType });
        onRecordingComplete(blob, duration);
      };

      mediaRecorder.start(1000);

      startBtn.disabled = true;
      stopBtn.disabled = false;
      setStatus('● Enregistrement en cours...', 'recording');
      document.getElementById('cameraConfig')?.classList.add('hidden-when-recording');

      screenTrack.onended = stopRecording;

    } catch (err) {
      console.error(err);
      onRecordingEnd?.();
      setStatus(err.name === 'NotAllowedError'
        ? 'Accès refusé. Autorisez l\'écran, la caméra et le micro.'
        : `Erreur : ${err.message}`);
      cleanup();
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    onRecordingEnd?.();
    cleanup();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    previewCanvas.hidden = true;
    previewPlaceholder.hidden = false;
    document.getElementById('cameraConfig')?.classList.remove('hidden-when-recording');
  }

  function cleanup() {
    stopSegmentationLoop();
    if (drawIntervalId) {
      clearInterval(drawIntervalId);
      drawIntervalId = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    gainNode = null;
    [screenStream, webcamStream, micStream].forEach(stream => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    });
    [screenVideoEl, webcamVideoEl].forEach(el => {
      if (el?.parentNode) el.parentNode.removeChild(el);
    });
    screenStream = null;
    webcamStream = null;
    micStream = null;
    screenVideoEl = null;
    webcamVideoEl = null;
  }

  startBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);

  return {
    stopRecording,
    setMicEnabled(enabled) {
      micEnabled = enabled;
      if (gainNode) gainNode.gain.value = enabled ? 1 : 0;
    },
    setCameraEnabled(enabled) { cameraEnabled = enabled; },
    setScreenEnabled(enabled) { screenEnabled = enabled; },
    getMicEnabled: () => micEnabled,
    getCameraEnabled: () => cameraEnabled,
    getScreenEnabled: () => screenEnabled,
    getPreviewCanvas: () => previewCanvas
  };
}
