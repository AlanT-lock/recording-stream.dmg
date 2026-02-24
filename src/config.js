/**
 * Configuration de l'application
 * Pour l'URL de téléchargement macOS, définir VITE_DOWNLOAD_URL au build
 * (ex: https://github.com/user/slide-recorder/releases/latest/download/SlideRecorder.dmg)
 */
export const DOWNLOAD_URL =
  import.meta.env?.VITE_DOWNLOAD_URL || '/downloads/SlideRecorder.dmg';
