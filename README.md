# OncoScan AI

A minimal React + Vite app for the `breast_cancer_detection.jsx` component.

## Run locally

1. Open PowerShell in `c:\Users\keerthi Raj\Downloads\oncoscan-app`
2. Run:
   - `npm install`
   - `npm run dev`
3. Open the local URL shown in the terminal.

## Deployment

### GitHub Pages

1. Install dependencies:
   - `npm install`
2. Initialize git and push to GitHub (if you have git installed):
   - `git init`
   - `git add .`
   - `git commit -m "Add deployment config"`
   - `git branch -M main`
   - `git remote add origin https://github.com/Keerthirj8217/oncoscan-app.git`
   - `git push -u origin main`
3. Publish to GitHub Pages:
   - `npm run deploy`
4. After deployment, your permanent URL will be:
   - `https://Keerthirj8217.github.io/oncoscan-app/`

### Vercel

1. Install dependencies:
   - `npm install`
2. Import the repo from GitHub into Vercel.
3. Use these settings in Vercel:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Vercel will give you a permanent URL such as:
   - `https://oncoscan-app.vercel.app`

## Notes

- The app uses a demo analysis result when `VITE_ANTHROPIC_API_KEY` is not set.
- If you want real Anthropics analysis, create a `.env` file in the project root with:
  - `VITE_ANTHROPIC_API_KEY=your_api_key_here`

## Files

- `src/App.jsx` — main React component
- `src/main.jsx` — entry point
- `src/index.css` — base styling
- `vite.config.js` — Vite config
