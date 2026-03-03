# Slide Recorder

Enregistrez vos présentations (slides Gamma, PowerPoint, etc.) avec votre visage en pastille — **100% gratuit, open source, sans abonnement**.

Parfait pour la création de formations e-learning.

![Slide Recorder](https://img.shields.io/badge/Open%20Source-MIT-green) ![Pas de backend](https://img.shields.io/badge/100%25-Client%20side-blue)

## ✨ Fonctionnalités

- **Enregistrement écran** — Capturez votre présentation, vos slides Gamma, ou tout ce qui s'affiche
- **Webcam en pastille** — Votre visage apparaît en overlay dans le coin supérieur droit
- **Audio micro** — Votre voix est enregistrée simultanément
- **Éditeur intégré** — Coupez le début et la fin de votre vidéo avant export
- **Export multi-format** — WebM (rapide) ou MP4 (compatible partout)
- **Qualité réglable** — Basse, moyenne, haute avec estimation de la taille du fichier
- **Stockage IndexedDB** — Réduit la pression mémoire (pas de crash sur les longs enregistrements)
- **Aucune donnée envoyée** — Tout se passe dans votre navigateur, FFmpeg.wasm tourne côté client

## 🚀 Installation et lancement

```bash
# Installer les dépendances
npm install

# Mode développement
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

Puis ouvrez **http://localhost:5173** (dev) ou **http://localhost:4173** (preview).

## 📖 Utilisation

1. Cliquez sur **Démarrer l'enregistrement**
2. Choisissez l'écran, la fenêtre ou l'onglet à partager
3. Autorisez la caméra et le micro
4. Présentez vos slides !
5. Cliquez sur **Arrêter** → vous accédez à la page d'édition
6. Ajustez le début et la fin (trim)
7. Choisissez format (WebM/MP4) et qualité
8. Téléchargez votre vidéo

## 📐 Options d'export

| Format | Usage |
|-------|-------|
| **WebM** | Rapide, pas de conversion. Idéal si vous ne coupez pas. |
| **MP4** | Compatible partout (YouTube, Vimeo, etc.). Nécessite FFmpeg (~31 Mo chargé au 1er export). |

| Qualité | Bitrate | ~Taille pour 5 min |
|---------|---------|---------------------|
| Basse | 1 Mbps | ~40 Mo |
| Moyenne | 3 Mbps | ~115 Mo |
| Haute | 6 Mbps | ~230 Mo |

## 🌐 Compatibilité

| Navigateur | Support |
|------------|---------|
| Chrome | ✅ Recommandé |
| Edge | ✅ Complet |
| Firefox | ✅ Complet |
| Safari | ⚠️ Limité — utilisez Chrome |

## 📄 Licence

MIT — Utilisez, modifiez, distribuez librement.

---

Fait avec ❤️ pour les organismes de formation
