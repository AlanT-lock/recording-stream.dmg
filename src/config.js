/**
 * Configuration de l'application
 * Pour l'URL de téléchargement macOS, définir VITE_DOWNLOAD_URL au build
 */
export const DOWNLOAD_URL =
  import.meta.env?.VITE_DOWNLOAD_URL ||
  'https://github.com/AlanT-lock/recording-stream.dmg/releases/download/v1.0.0/Slide.Recorder-1.0.0-arm64.dmg';
