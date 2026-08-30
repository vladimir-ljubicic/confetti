# 02 — 1600px viewer rendition

**What to build:** The full-screen viewer currently shows the 800px grid thumb,
visibly soft on a 3× phone. Add a second client-generated rendition at upload
and swap it in behind the thumb.

**Status:** done

## Sizes (checked against devices, 2026-08-30)

- Thumb stays 800px wide: a 2-column tile is ~165–200 CSS px, so worst-case
  ~600 physical px on a 3× phone, with headroom for 2-column tablets. ~50 kB
  at JPEG q0.8.
- Viewer rendition: 1600px wide, JPEG q0.8, ~150–250 kB. The widest phone is
  ~1290 physical px (430 CSS × 3), and both orientations are width-constrained
  in the viewer, so 1600 covers every phone with margin; 2048 only helps
  desktop fullscreen, where download-original exists.
- Keep width-based scaling and JPEG output (Safari cannot encode WebP from
  canvas).

## Generation

In the upload pipeline, decode once and `toBlob` twice (800, 1600); PUT both
to the bucket the photo's visibility dictates (issue 01), viewer at
`<photoId>/viewer.jpg`. Skip the 1600 pass when the source is already ≤800
wide. HEIC keeps its existing decode fallback — one decode feeds both.

## Viewer behaviour

- The viewer keeps rendering the thumb immediately, then loads the viewer
  rendition and swaps on `load` — no blank frame, no layout shift (same aspect
  ratio).
- `error` keeps the thumb: covers photos uploaded before this lands and failed
  generation. No DB flag needed.
- Same for the my-photos viewer; private photos load the rendition through the
  signed proxy with a `?size=viewer` variant (or a sibling route) that signs
  `<photoId>/viewer.jpg`.
- Download keeps handing out the untouched original.

## Acceptance

- [x] Viewer visibly sharpens after open on a photo with a rendition; thumb
      remains for one without
- [x] Upload produces both objects; complete-route metadata unchanged except
      paths
- [x] No layout shift on swap
- [x] Private photo viewer shows the rendition via signed URL
