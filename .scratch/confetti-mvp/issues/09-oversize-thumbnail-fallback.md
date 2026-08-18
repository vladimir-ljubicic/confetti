# 09 — Client thumbnail fallback for oversize files

**What to build:** Files above the 25MB image-transform source limit still render in the gallery: at upload time the browser generates a thumbnail and uploads it alongside the original, and the gallery uses it whenever the original exceeds the transform limit. Original download is unaffected.

**Blocked by:** 02 — Tracer: upload one photo → see it in gallery.

**Status:** ready-for-agent

- [ ] Upload of a >25MB photo produces and stores a client-generated thumbnail
- [ ] Gallery renders the thumbnail for oversize files, transforms for the rest
- [ ] Original stays untouched and downloadable
