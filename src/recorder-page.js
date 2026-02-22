/**
 * Page d'enregistrement
 */

import { initRecorder } from './recorder.js';
import { saveRecording } from './storage.js';
import { initPipManager, requestPipWindow, setRecordingEnded, setRecorderControls } from './pip-manager.js';
import { initCameraPreview } from './camera-preview.js';

initPipManager();
initCameraPreview();

const recorderControls = initRecorder({
  onBeforeStart: requestPipWindow,
  onRecordingEnd: setRecordingEnded,
  onStatus(msg, type) {
    const el = document.getElementById('status');
    if (el) {
      el.textContent = msg;
      el.className = 'status' + (type ? ` ${type}` : '');
    }
  },
  async onRecordingComplete(blob, duration) {
    const id = await saveRecording(blob, duration);
    window.location.href = `./editor.html?id=${encodeURIComponent(id)}`;
  }
});

setRecorderControls(recorderControls);
