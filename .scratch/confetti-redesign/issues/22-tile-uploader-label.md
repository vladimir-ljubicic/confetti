# 22 — Uploader label on gallery tiles

**What to build:** Bottom-left uploader name on tiles in the main gallery (1a/1b) and the
per-guest gallery (7b). Not on profile (8a) or admin grids — those stay label-free.

**Status:** done

- [x] Format **"First L."** from `display_name`, computed client-side: first
      whitespace-separated token + initial of the last token with a dot; omit " L."
      entirely when the name is a single token
- [x] Style: 11px, letter-spacing 0.04em, `#fffdf8`,
      `text-shadow: 0 1px 4px rgba(27,24,21,0.65)`, `left/bottom: 10px`,
      `max-width: 60%`, ellipsized, single line. **No pill, no scrim** — sits opposite
      the glass heart pill
- [x] Rework the existing `showUploader` chip in `photo-grid.tsx` to this spec; enable it
      on `/` and `/uploader/[publicId]`, keep off on `/my-photos` and admin grids
- [x] Nothing rendered when uploader has no display name

## Comments

Decided (grilling 2026-08-28): label is a link to `/uploader/[publicId]` — invisible
enlarged hit area (~44px, bottom-left) with stopPropagation so the tile still opens the
viewer; no visual change to the spec. Active on 7b too (self-link, harmless). Name
rendered as typed, no uppercase. The existing `showUploader` chip is dead code today (no
page passes it) — this rework revives it.
