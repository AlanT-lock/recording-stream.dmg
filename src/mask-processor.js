/**
 * Post-traitement du masque de segmentation pour améliorer le découpage.
 * - Lissage des bords (flou gaussien sur le masque)
 * - Érosion légère pour réduire les fuites du fond
 * - Contrôle du seuil pour des transitions plus propres
 */

import { blurImageData } from '@kayahr/stackblur';

/**
 * Applique un flou sur le masque pour lisser les bords (évite les découpes en escalier).
 * @param {ImageData} maskData - ImageData RGBA, on utilise le canal R comme valeur du masque
 * @param {number} radius - Rayon du flou (1-10 recommandé)
 */
export function smoothMaskEdges(maskData, radius = 3) {
  if (radius <= 0) return;
  blurImageData(maskData, Math.min(Math.max(1, radius), 50), false);
}

/**
 * Érosion du masque : contracte la zone "personne" pour éliminer les pixels de fond qui fuient.
 * Prend le minimum sur un voisinage 3x3 ou 5x5.
 * @param {ImageData} maskData - ImageData en place (modifié)
 * @param {number} passes - Nombre de passes d'érosion (1-2 recommandé)
 */
export function erodeMask(maskData, passes = 1) {
  const { data, width, height } = maskData;
  const buf = new Uint8ClampedArray(data.length);
  let src = data;
  let dst = buf;

  for (let p = 0; p < passes; p++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        let minV = 255;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = ((y + dy) * width + (x + dx)) * 4;
            minV = Math.min(minV, src[ni]);
          }
        }
        dst[i] = dst[i + 1] = dst[i + 2] = minV;
        dst[i + 3] = 255;
      }
    }
    [src, dst] = [dst, src];
  }
  if (src !== data) {
    data.set(src);
  }
}

/**
 * Renforce le masque : pousse les valeurs vers 0 ou 255 pour un découpage plus net.
 * Réduit les zones grises ambiguës.
 * @param {ImageData} maskData - ImageData en place
 * @param {number} strength - 0 = pas de changement, 1 = binaire strict
 */
export function sharpenMaskThreshold(maskData, strength = 0.3) {
  const { data } = maskData;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] / 255;
    const pushed = v < 0.5
      ? v * (1 - strength)
      : 1 - (1 - v) * (1 - strength);
    const out = Math.round(pushed * 255);
    data[i] = data[i + 1] = data[i + 2] = out;
    data[i + 3] = 255;
  }
}

/**
 * Pipeline complet de post-traitement du masque.
 * Ordre : érosion (coupe les fuites) → flou (lisse) → optionnel sharpen
 */
export function processMask(maskCtx, width, height, options = {}) {
  const {
    edgeSmoothRadius = 4,
    erosionPasses = 1,
    sharpenStrength = 0.2,
  } = options;

  const maskData = maskCtx.getImageData(0, 0, width, height);

  if (erosionPasses > 0) {
    erodeMask(maskData, erosionPasses);
  }
  if (edgeSmoothRadius > 0) {
    smoothMaskEdges(maskData, edgeSmoothRadius);
  }
  if (sharpenStrength > 0) {
    sharpenMaskThreshold(maskData, sharpenStrength);
  }

  maskCtx.putImageData(maskData, 0, 0);
}
