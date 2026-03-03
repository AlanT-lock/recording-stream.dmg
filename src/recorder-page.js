/**
 * Page d'enregistrement
 */

import '../styles.css';
import { initRecorder } from './recorder.js';
import { saveRecording } from './storage.js';
import { initCameraPreview } from './camera-preview.js';

initCameraPreview();

const recorderControls = initRecorder({
  onRecordingEnd: () => {},
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
