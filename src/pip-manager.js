/**
 * Picture-in-Picture : fenêtre compacte avec aperçu et contrôles
 * Web : documentPictureInPicture | Electron : fenêtre native macOS
 */

import { icons } from './icons.js';

let pipWindow = null;
let recordingInProgress = false;
let recorderControls = null;
let pipPreviewVideo = null;

const PIP_PREVIEW_WIDTH = 360;
const PIP_BUTTON_HEIGHT = 44;
const PIP_PADDING = 8;

const isElectron = !!window.electronAPI?.isElectron;

export function initPipManager() {
  if (isElectron) {
    window.electronAPI?.onPipControl?.((action) => {
      if (!recorderControls) return;
      if (action === 'mic') recorderControls.setMicEnabled(!recorderControls.getMicEnabled());
      if (action === 'cam') recorderControls.setCameraEnabled(!recorderControls.getCameraEnabled());
      if (action === 'screen') recorderControls.setScreenEnabled(!recorderControls.getScreenEnabled());
      if (action === 'stop') recorderControls.stopRecording();
    });
  }

  if (!window.documentPictureInPicture && !isElectron) return;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      moveContentToPip();
    } else {
      moveContentBackAndClosePip();
    }
  });
}

export function setRecorderControls(controls) {
  recorderControls = controls;
}

export function requestPipWindow() {
  if (pipWindow) return Promise.resolve();

  recordingInProgress = true;

  if (isElectron) {
    return Promise.resolve();
  }

  if (!window.documentPictureInPicture) return Promise.resolve();

  const previewHeight = Math.round(PIP_PREVIEW_WIDTH / (16 / 9));
  const totalHeight = previewHeight + PIP_BUTTON_HEIGHT + PIP_PADDING * 2;

  return window.documentPictureInPicture.requestWindow({
    width: PIP_PREVIEW_WIDTH + PIP_PADDING * 2,
    height: totalHeight
  }).then(win => {
    pipWindow = win;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    const mainCss = document.querySelector('link[rel="stylesheet"]');
    link.href = mainCss?.href || '/styles.css';
    pipWindow.document.head.appendChild(link);
    pipWindow.document.body.style.cssText = 'margin:0;padding:0;background:#0f0f12;color:#e4e4e7;overflow:hidden;';
    pipWindow.document.body.innerHTML = '<p style="opacity:0.6;font-size:13px;padding:1rem;text-align:center;">La prévisualisation apparaîtra ici quand vous quitterez la page</p>';

    pipWindow.addEventListener('pagehide', () => {
      cleanupPipContent();
      pipWindow = null;
    });
  }).catch(err => {
    recordingInProgress = false;
    console.warn('PiP non disponible:', err);
  });
}

export function setRecordingEnded() {
  recordingInProgress = false;
}

function cleanupPipContent() {
  if (pipPreviewVideo) {
    pipPreviewVideo.srcObject = null;
    pipPreviewVideo = null;
  }
}

function buildPipContent() {
  const canvas = recorderControls?.getPreviewCanvas?.();
  if (!canvas || !pipWindow || !recorderControls) return null;

  const previewHeight = Math.round(PIP_PREVIEW_WIDTH / (16 / 9));
  const stream = canvas.captureStream(30);

  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex;flex-direction:column;padding:${PIP_PADDING}px;gap:${PIP_PADDING}px;height:100%;box-sizing:border-box;`;

  const previewWrap = document.createElement('div');
  previewWrap.style.cssText = `flex:0 0 ${previewHeight}px;background:#1a1a20;border-radius:8px;overflow:hidden;position:relative;`;
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
  video.srcObject = stream;
  video.play().catch(() => {});
  previewWrap.appendChild(video);
  wrap.appendChild(previewWrap);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';

  const btnBase = 'width:36px;height:36px;padding:0;background:#1a1a20;border:1px solid #27272a;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#e4e4e7;';

  const micBtn = document.createElement('button');
  micBtn.innerHTML = recorderControls.getMicEnabled() ? icons.mic : icons.micOff;
  micBtn.title = recorderControls.getMicEnabled() ? 'Couper le micro' : 'Réactiver le micro';
  micBtn.style.cssText = btnBase;
  micBtn.onclick = () => {
    const next = !recorderControls.getMicEnabled();
    recorderControls.setMicEnabled(next);
    micBtn.innerHTML = next ? icons.mic : icons.micOff;
    micBtn.title = next ? 'Couper le micro' : 'Réactiver le micro';
  };

  const camBtn = document.createElement('button');
  camBtn.innerHTML = recorderControls.getCameraEnabled() ? icons.video : icons.videoOff;
  camBtn.title = recorderControls.getCameraEnabled() ? 'Désactiver la caméra' : 'Réactiver la caméra';
  camBtn.style.cssText = btnBase + ';opacity:' + (recorderControls.getCameraEnabled() ? '1' : '0.5') + ';';
  camBtn.onclick = () => {
    const next = !recorderControls.getCameraEnabled();
    recorderControls.setCameraEnabled(next);
    camBtn.innerHTML = next ? icons.video : icons.videoOff;
    camBtn.title = next ? 'Désactiver la caméra' : 'Réactiver la caméra';
    camBtn.style.opacity = next ? '1' : '0.5';
  };

  const screenBtn = document.createElement('button');
  screenBtn.innerHTML = recorderControls.getScreenEnabled() ? icons.monitor : icons.monitorOff;
  screenBtn.title = recorderControls.getScreenEnabled() ? 'Désactiver la capture d\'écran' : 'Réactiver la capture d\'écran';
  screenBtn.style.cssText = btnBase + ';opacity:' + (recorderControls.getScreenEnabled() ? '1' : '0.5') + ';';
  screenBtn.onclick = () => {
    const next = !recorderControls.getScreenEnabled();
    recorderControls.setScreenEnabled(next);
    screenBtn.innerHTML = next ? icons.monitor : icons.monitorOff;
    screenBtn.title = next ? 'Désactiver la capture d\'écran' : 'Réactiver la capture d\'écran';
    screenBtn.style.opacity = next ? '1' : '0.5';
  };

  const stopBtn = document.createElement('button');
  stopBtn.innerHTML = icons.stop;
  stopBtn.appendChild(document.createTextNode(' Arrêter'));
  stopBtn.style.cssText = 'padding:8px 14px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:4px;';
  stopBtn.title = 'Arrêter l\'enregistrement';
  stopBtn.onclick = () => recorderControls.stopRecording();

  btnRow.appendChild(micBtn);
  btnRow.appendChild(camBtn);
  btnRow.appendChild(screenBtn);
  btnRow.appendChild(stopBtn);
  wrap.appendChild(btnRow);

  pipPreviewVideo = video;
  return wrap;
}

let pipRetryCount = 0;

function moveContentToPip() {
  if (!recorderControls) return;
  if (!recordingInProgress) return;

  const canvas = recorderControls.getPreviewCanvas?.();
  if (!canvas) return;

  if (canvas.width === 0 && pipRetryCount < 40) {
    pipRetryCount++;
    setTimeout(moveContentToPip, 100);
    return;
  }
  pipRetryCount = 0;

  if (isElectron) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      window.electronAPI?.requestPipWindow?.({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }
    return;
  }

  if (!pipWindow) return;

  const content = buildPipContent();
  if (!content) return;

  pipWindow.document.body.innerHTML = '';
  pipWindow.document.body.style.display = 'flex';
  pipWindow.document.body.style.flexDirection = 'column';
  pipWindow.document.body.appendChild(content);
}

function moveContentBackAndClosePip() {
  cleanupPipContent();
  if (isElectron) {
    window.electronAPI?.closePipWindow?.();
    return;
  }
  if (pipWindow && !pipWindow.closed) {
    pipWindow.close();
    pipWindow = null;
  }
}
