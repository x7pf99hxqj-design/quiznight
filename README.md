# 🎯 QuizNight

Multiplayer Quiz-App für LAN und Online.

## Lokal starten

```bash
npm install
npm run dev
```
→ http://localhost:5173

## Online deployen (Railway) – kostenlos

### 1. GitHub Repo erstellen
1. Gehe zu https://github.com/new
2. Repo erstellen (z.B. `quiznight`)
3. Im quiz-app Ordner:
```bash
git init
git add .
git commit -m "QuizNight"
git remote add origin https://github.com/DEIN-NAME/quiznight.git
git push -u origin main
```

### 2. Railway verbinden
1. Gehe zu https://railway.app
2. "Start a New Project" → "Deploy from GitHub repo"
3. Dein Repo auswählen
4. Railway baut automatisch alles → du bekommst eine URL wie `quiznight-production.up.railway.app`
5. Diese URL mit Freunden teilen – fertig!

### Tipp: Eigene Domain
Railway gibt dir eine kostenlose `.up.railway.app` URL.
Du kannst auch eine eigene Domain verknüpfen.

## Fragen anpassen

Datei öffnen: `shared/questions.ts`
Neue Fragen einfach unten anhängen, ID hochzählen, fertig.
