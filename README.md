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
- By default the page can also preload items from `gallery/manifest.json` (so your photos show first) while still allowing uploads.
- If you want an "empty start" link (no preloaded items), open: `/?empty=1`

## Privacy note
If you push personal photos inside `gallery/` to GitHub, they can be accessed by direct URL even if you don't preload them. Remove those files from `gallery/` if you want them private.

### Showcase (optional)
If you want to force an empty start from the same site, use `?empty=1`.

## Files
- `index.html` — HTML markup only
- `assets/styles.css` — styling
- `assets/app.js` — functionality (gallery, viewer, slideshow, music)
