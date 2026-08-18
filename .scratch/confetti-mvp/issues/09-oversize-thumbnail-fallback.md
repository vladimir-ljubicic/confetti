# 09 — Client thumbnail fallback for oversize files

**What to build:** Files above the 25MB image-transform source limit still render in the gallery: at upload time the browser generates a thumbnail and uploads it alongside the original, and the gallery uses it whenever the original exceeds the transform limit. Original download is unaffected.

**Blocked by:** 02 — Tracer: upload one photo → see it in gallery.

**Status:** ready-for-agent

- [x] Upload of a >25MB photo produces and stores a client-generated thumbnail
- [x] Gallery renders the thumbnail for oversize files, transforms for the rest
- [x] Original stays untouched and downloadable

## Comments

Implemented: photos gain a nullable `thumbnail_path` (migration 0005, applied).
`/api/uploads` signs a second upload slot at `<uploader>/<photo>.thumb.jpg`
when the reported size exceeds the 25MB transform limit; the client downscales
to 800px JPEG via canvas (`src/lib/thumbnail.ts`) and PUTs it to the signed
URL, best-effort. The complete route verifies the thumbnail object exists and
clears the path otherwise. `imageSource` now returns `thumbnail` for oversize
files that have one (also when transforms are off), and `galleryImageUrl`
signs the thumbnail instead of a transform. Original storage object and
download URL untouched.

Known limitation: an oversize file the browser cannot decode (e.g. a >25MB
HEIC picked in Chrome/Firefox) uploads without a thumbnail and the gallery
falls back to the raw original, which those browsers cannot render. No
warning is shown; considered acceptable for v1 since >25MB HEIC is rare.
