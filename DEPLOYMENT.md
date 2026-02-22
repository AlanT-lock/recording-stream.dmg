# Déploiement sur Vercel

## Étapes

### 1. Créer un dépôt GitHub

1. Va sur [github.com/new](https://github.com/new)
2. Nom du dépôt : `slide-recorder` (ou autre)
3. Ne coche pas "Add a README" (le projet en a déjà un)
4. Clique sur **Create repository**

### 2. Pousser le code

Dans le terminal, depuis le dossier du projet :

```bash
cd /Users/alantouati/slide-recorder

# Initialiser git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Slide Recorder"

# Remplacer par l'URL de ton dépôt (ex: https://github.com/TON_USERNAME/slide-recorder.git)
git remote add origin https://github.com/TON_USERNAME/slide-recorder.git

# Pousser
git branch -M main
git push -u origin main
```

### 3. Déployer sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte-toi
2. **Add New** → **Project**
3. Importe le dépôt `slide-recorder` depuis GitHub
4. Vercel détecte automatiquement Vite (build: `npm run build`, output: `dist`)
5. Clique sur **Deploy**

Le déploiement est automatique à chaque push sur `main`.
