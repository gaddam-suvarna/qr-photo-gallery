# Media Gallery + Slideshow

A simple single-page media gallery for photos/videos with an automatic slideshow (multi-photo collages + PPT-like transitions) and optional background music.

## Run
Open `index.html` in your browser.

## Live demo (GitHub Pages)
After enabling GitHub Pages for this repository, open:

https://gaddam-suvarna.github.io/qr-photo-gallery/

Enable Pages (one-time): Repo → **Settings** → **Pages** → **Deploy from a branch** → Branch: `main` → Folder: `/(root)` → **Save**.

## Note
This repo currently includes the `gallery/` folder (photos/audio). If you want it private, make the repo **Private** or remove `gallery/` from Git history and add it back to `.gitignore`.

## User uploads
- Users can upload their own photos/videos using **Add photos/videos** or drag-and-drop.
- This is a static site (no backend), so uploaded files are not saved to the server; refreshing the page may reset the gallery.
- If you want the site to start empty for everyone (recommended for a QR share link), keep `gallery/manifest.json` with `"items": []`.
- For privacy, also delete your personal files from `gallery/` before pushing to GitHub.

### Showcase (optional)
If you ever want to preload the bundled `gallery/` items again, open the page with `?showcase=1`.
Example: `https://<your-site>/?showcase=1`

## Files
- `index.html` — HTML markup only
- `assets/styles.css` — styling
- `assets/app.js` — functionality (gallery, viewer, slideshow, music)
