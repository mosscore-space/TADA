# TADA — work trip tracker (PWA)

Static app, no build step. Files: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`.

## Host on GitHub Pages
1. Create a repo (e.g. `tada`), upload everything in this folder to the root.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<user>.github.io/tada/` on your phone → browser menu → **Install app / Add to Home screen**.

## Save data to a GitHub repo (Settings → GitHub data sync)
1. Create a **private** repo for data, e.g. `tada-data` (keep it separate from the Pages repo, which is public).
2. GitHub → Settings → Developer settings → Fine-grained tokens → new token:
   repository access = only `tada-data`, permission **Contents: Read and write**.
3. In TADA → Settings → GitHub data sync: enter `user/tada-data`, branch, paste the token → **Save & sync now**.
   Trips and settings are stored in `tada-data.json`; devices merge by last edit.

## Updating the app later
Bump `CACHE` in `sw.js` (e.g. `tada-v2`) when you push changes so installed copies refetch.
