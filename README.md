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

## One password on every device (connection file)
1. On a device that's already linked: Settings → GitHub data sync → **Download connection file** (asks for your TADA password).
2. Put `tada-connection.json` in the root of the Pages repo next to `index.html`, commit.
3. On any new phone/PC/reinstall: open the site, type the same password → it connects to the data repo and pulls your trips. No repo or token to retype.

The file holds repo + branch + path + token, encrypted with your password (AES-GCM, PBKDF2-SHA256 600k rounds). It's public on GitHub Pages, so:
use a strong passphrase, keep the token fine-grained (one data repo, Contents read/write only), and never give that token access to the site repo.
If you change your password or rotate the token, download a new connection file and replace the old one.

## Updating the app later
Bump `CACHE` in `sw.js` (e.g. `tada-v2`) when you push changes so installed copies refetch.
