# Steady Log (iPhone PWA) – Install & Use

This is a **weights-only** workout logging app (dark mode) built as a **PWA** (Progressive Web App).
It runs in Safari and can be added to your iPhone Home Screen like a normal app.

## 1) How to run it on iPhone (recommended)
iPhone needs PWAs to be served from a website (HTTPS). Easiest options:

### Option A: GitHub Pages (free)
1. Create a GitHub account (if you don’t have one).
2. Create a new repo called: `steady-log`
3. Upload the contents of this folder into the repo.
4. In repo **Settings → Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / folder: `/ (root)`
5. You’ll get a URL like: `https://YOURNAME.github.io/steady-log/`
6. Open that URL in Safari on your iPhone.
7. Tap **Share** → **Add to Home Screen**.

### Option B: Netlify / Vercel (free)
Drag-and-drop the folder (or zip) onto Netlify, it will give you a URL.
Open in Safari → Add to Home Screen.

## 2) Using the app
- Tap **Start Workout** → pick a template (Upper A, etc.)
- Tap **+ Set** to add set rows
- Enter **KG** and **Reps**
- Tap **Finish & Save** to store it

## 3) Backup
Go to **Export** and download a CSV.

## 4) Offline
Once you open it once, it will keep working offline (service worker).

Enjoy.
