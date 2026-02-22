/**
 * Page éditeur - Chargée uniquement après redirection
 */

import { getRecording, deleteRecording } from './storage.js';
import { processVideo, estimateFileSize } from './ffmpeg-service.js';

const urlParams = new URLSearchParams(window.location.search);
const recordingId = urlParams.get('id');

if (!recordingId) {
  window.location.href = './';
} else {
  initEditor(recordingId);
}

function initEditor(currentRecordingId) {
  const editorVideo = document.getElementById('editorVideo');
  const trimStart = document.getElementById('trimStart');
  const trimEnd = document.getElementById('trimEnd');
  const trimStartRange = document.getElementById('trimStartRange');
  const trimEndRange = document.getElementById('trimEndRange');
  const cutSegmentsList = document.getElementById('cutSegmentsList');
  const addCutSegmentBtn = document.getElementById('addCutSegmentBtn');
  const exportFormat = document.getElementById('exportFormat');
  const exportQuality = document.getElementById('exportQuality');
  const exportEstimate = document.getElementById('exportEstimate');
  const exportBtn = document.getElementById('exportBtn');
  const exportProgress = document.getElementById('exportProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  let videoDuration = 0;
  let cutSegments = [];

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function computeKeepSegments() {
    const start = parseFloat(trimStart.value) || 0;
    const end = parseFloat(trimEnd.value) || videoDuration;
    let segments = [{ start, end }];

    for (const cut of cutSegments.sort((a, b) => a.start - b.start)) {
      const next = [];
      for (const seg of segments) {
        if (cut.end <= seg.start || cut.start >= seg.end) {
          next.push(seg);
        } else {
          if (seg.start < cut.start) {
            next.push({ start: seg.start, end: Math.min(seg.end, cut.start) });
          }
          if (seg.end > cut.end) {
            next.push({ start: Math.max(seg.start, cut.end), end: seg.end });
          }
        }
      }
      segments = next.filter(s => s.end > s.start);
    }
    return segments;
  }

  function getTotalDuration() {
    return computeKeepSegments().reduce((sum, s) => sum + (s.end - s.start), 0);
  }

  function updateEstimate() {
    const duration = getTotalDuration();
    const quality = exportQuality.value;
    const format = exportFormat.value;

    const sizeMB = estimateFileSize(quality, duration, format);
    const sizeStr = sizeMB < 1 ? `${Math.round(sizeMB * 1024)} Ko` : `${sizeMB.toFixed(1)} Mo`;
    exportEstimate.textContent = `Estimation : ~${sizeStr} pour ${formatDuration(duration)}`;
  }

  function syncTrimFromRange() {
    if (videoDuration <= 0) return;
    const startPct = parseFloat(trimStartRange.value) / 100;
    const endPct = parseFloat(trimEndRange.value) / 100;
    trimStart.value = (videoDuration * startPct).toFixed(1);
    trimEnd.value = (videoDuration * endPct).toFixed(1);
    updateEstimate();
  }

  function syncRangeFromTrim() {
    if (videoDuration <= 0) return;
    const start = parseFloat(trimStart.value) || 0;
    const end = parseFloat(trimEnd.value) || videoDuration;
    trimStartRange.value = Math.min(100, (start / videoDuration) * 100);
    trimEndRange.value = Math.max(0, (end / videoDuration) * 100);
    updateEstimate();
  }

  function renderCutSegments() {
    cutSegmentsList.innerHTML = '';
    for (let i = 0; i < cutSegments.length; i++) {
      const cut = cutSegments[i];
      const row = document.createElement('div');
      row.className = 'cut-segment-row';
      row.innerHTML = `
        <span class="cut-segment-label">De</span>
        <input type="number" data-index="${i}" data-field="start" min="0" max="${videoDuration}" step="0.1" value="${cut.start.toFixed(1)}">
        <span class="cut-segment-label">à</span>
        <input type="number" data-index="${i}" data-field="end" min="0" max="${videoDuration}" step="0.1" value="${cut.end.toFixed(1)}">
        <span class="cut-segment-label">sec</span>
        <button type="button" class="btn-remove-cut" data-index="${i}">Supprimer</button>
      `;
      row.querySelector('input[data-field="start"]').addEventListener('input', (e) => {
        cutSegments[i].start = parseFloat(e.target.value) || 0;
        updateEstimate();
      });
      row.querySelector('input[data-field="end"]').addEventListener('input', (e) => {
        cutSegments[i].end = parseFloat(e.target.value) || 0;
        updateEstimate();
      });
      row.querySelector('.btn-remove-cut').addEventListener('click', () => {
        cutSegments.splice(i, 1);
        renderCutSegments();
        updateEstimate();
      });
      cutSegmentsList.appendChild(row);
    }
  }

  trimStart.addEventListener('input', syncRangeFromTrim);
  trimEnd.addEventListener('input', syncRangeFromTrim);
  trimStartRange.addEventListener('input', syncTrimFromRange);
  trimEndRange.addEventListener('input', syncTrimFromRange);
  exportFormat.addEventListener('change', updateEstimate);
  exportQuality.addEventListener('change', updateEstimate);

  addCutSegmentBtn.addEventListener('click', () => {
    const start = parseFloat(trimStart.value) || 0;
    const end = parseFloat(trimEnd.value) || videoDuration;
    const mid = (start + end) / 2;
    cutSegments.push({ start: Math.max(start, mid - 2.5), end: Math.min(end, mid + 2.5) });
    renderCutSegments();
    updateEstimate();
  });

  editorVideo.addEventListener('loadedmetadata', () => {
    videoDuration = editorVideo.duration;
    trimEnd.value = videoDuration.toFixed(1);
    trimEnd.setAttribute('max', videoDuration);
    trimStart.setAttribute('max', videoDuration);
    trimEndRange.value = 100;
    renderCutSegments();
    updateEstimate();
  });

  exportBtn.addEventListener('click', async () => {
    const keepSegments = computeKeepSegments();

    if (keepSegments.length === 0) {
      alert('Aucun segment à conserver. Ajustez les coupures.');
      return;
    }

    const format = exportFormat.value;
    const quality = exportQuality.value;

    exportBtn.disabled = true;
    exportProgress.hidden = false;
    progressFill.style.width = '0%';
    progressText.textContent = format === 'mp4' ? 'Chargement de FFmpeg...' : 'Préparation...';

    try {
      const { blob } = await getRecording(currentRecordingId);

      let outputBlob;

      const totalDuration = getTotalDuration();
      const isSingleSegment = keepSegments.length === 1;
      const isFullVideo = isSingleSegment && keepSegments[0].start === 0 && keepSegments[0].end >= videoDuration - 0.5;

      if (format === 'webm' && isFullVideo) {
        progressText.textContent = 'Téléchargement...';
        outputBlob = blob;
      } else {
        progressText.textContent = 'Conversion en cours... (peut prendre 1-2 min)';
        outputBlob = await processVideo(blob, {
          keepSegments,
          format,
          quality
        }, (pct) => {
          progressFill.style.width = `${pct}%`;
          progressText.textContent = `Conversion : ${pct}%`;
        });
      }

      const ext = format === 'mp4' ? 'mp4' : 'webm';
      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-recording-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      progressText.textContent = 'Téléchargement terminé !';
      progressFill.style.width = '100%';

    } catch (err) {
      console.error(err);
      progressText.textContent = `Erreur : ${err.message}`;
    } finally {
      exportBtn.disabled = false;
      setTimeout(() => {
        exportProgress.hidden = true;
      }, 2000);
    }
  });

  (async () => {
    try {
      const recording = await getRecording(currentRecordingId);
      if (!recording || !recording.blob) {
        alert('Vidéo introuvable. Retour à l\'enregistrement.');
        window.location.href = './';
        return;
      }
      videoDuration = recording.duration || 0;
      editorVideo.src = URL.createObjectURL(recording.blob);
      trimEnd.value = (recording.duration || 0).toFixed(1);
      trimStart.value = '0';
      trimStartRange.value = 0;
      trimEndRange.value = 100;
      cutSegments = [];
      renderCutSegments();
      updateEstimate();
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement. Retour à l\'enregistrement.');
      window.location.href = '/';
    }
  })();
}
