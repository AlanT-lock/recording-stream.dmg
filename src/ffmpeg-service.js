/**
 * FFmpeg.wasm - Conversion et trim côté client (aucun serveur)
 * Support des segments multiples (couper début, fin et moments au milieu)
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let loaded = false;

export async function loadFFmpeg(onProgress) {
  if (loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));
  }

  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  loaded = true;
  return ffmpeg;
}

/**
 * Trim + conversion avec support de segments multiples
 * @param {Blob} inputBlob - Vidéo WebM source
 * @param {Object} options - { keepSegments: [{start, end}, ...], format: 'mp4'|'webm', quality: 'low'|'medium'|'high' }
 */
export async function processVideo(inputBlob, options, onProgress) {
  const ff = await loadFFmpeg(onProgress);

  const { keepSegments = [], format = 'mp4', quality = 'medium' } = options;

  const qualityPresets = {
    low: { videoBitrate: '1M', audioBitrate: '96k' },
    medium: { videoBitrate: '3M', audioBitrate: '128k' },
    high: { videoBitrate: '6M', audioBitrate: '192k' },
  };

  const { videoBitrate, audioBitrate } = qualityPresets[quality] || qualityPresets.medium;

  await ff.writeFile('input.webm', await fetchFile(inputBlob));

  const segments = keepSegments.filter(s => s.end > s.start).sort((a, b) => a.start - b.start);

  if (segments.length === 0) {
    throw new Error('Aucun segment à conserver');
  }

  let args;

  if (segments.length === 1) {
    const { start, end } = segments[0];
    args = ['-i', 'input.webm'];
    if (start > 0) args.push('-ss', String(start));
    if (end != null) args.push('-to', String(end));
    if (format === 'mp4') {
      args.push('-c:v', 'libx264', '-preset', 'medium', '-b:v', videoBitrate);
      args.push('-c:a', 'aac', '-b:a', audioBitrate);
      args.push('-y', 'output.mp4');
    } else {
      args.push('-c:v', 'libvpx-vp9', '-b:v', videoBitrate);
      args.push('-c:a', 'libopus', '-b:a', audioBitrate);
      args.push('-y', 'output.webm');
    }
    await ff.exec(args);
  } else {
    const n = segments.length;
    const vFilters = segments.map((s, i) =>
      `[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS[v${i}]`
    ).join(';');
    const aFilters = segments.map((s, i) =>
      `[0:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS[a${i}]`
    ).join(';');
    const concatV = segments.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[outv]`;
    const concatA = segments.map((_, i) => `[a${i}]`).join('') + `concat=n=${n}:v=0:a=1[outa]`;

    const filterComplex = `${vFilters};${aFilters};${concatV};${concatA}`;
    const outputFile = format === 'mp4' ? 'output.mp4' : 'output.webm';

    args = [
      '-i', 'input.webm',
      '-filter_complex', filterComplex,
      '-map', '[outv]', '-map', '[outa]',
    ];
    if (format === 'mp4') {
      args.push('-c:v', 'libx264', '-preset', 'medium', '-b:v', videoBitrate);
      args.push('-c:a', 'aac', '-b:a', audioBitrate);
    } else {
      args.push('-c:v', 'libvpx-vp9', '-b:v', videoBitrate);
      args.push('-c:a', 'libopus', '-b:a', audioBitrate);
    }
    args.push('-y', outputFile);

    await ff.exec(args);
  }

  const outputFile = format === 'mp4' ? 'output.mp4' : 'output.webm';
  const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
  const data = await ff.readFile(outputFile);

  await ff.deleteFile('input.webm');
  await ff.deleteFile(outputFile);

  return new Blob([data.buffer], { type: mimeType });
}

/**
 * Estimation taille fichier : (bitrate Mbps × durée sec) / 8 = Mo
 */
export function estimateFileSize(quality, durationSec, format) {
  const presets = {
    low: { video: 1, audio: 0.096 },
    medium: { video: 3, audio: 0.128 },
    high: { video: 6, audio: 0.192 },
  };
  const { video, audio } = presets[quality] || presets.medium;
  const totalMbps = video + audio;
  const sizeMB = (totalMbps * durationSec) / 8;
  return sizeMB;
}
