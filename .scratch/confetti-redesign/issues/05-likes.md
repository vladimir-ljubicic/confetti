# 05 — Per-photo likes

**What to build:** New feature. One like per guest per photo, toggled optimistically from a
glass pill on every tile (1a) and from the viewer (7a). Count shown when non-zero.

**Blocked by:** 04

**Status:** done

Server:
- [ ] Migration: `likes` table (photo_id × uploader identity, unique) + denormalized
      `like_count` on photos; API to toggle; counts in gallery/viewer payloads
- [ ] Tied to the same local guest identity as the display name

Client:
- [ ] Glass pill per README spec: `min-width:34px; height:34px; padding:0 10px;
      border-radius:999px; background:rgba(27,24,21,0.58); backdrop-filter:blur(6px);
      box-sizing:border-box` (border-box is load-bearing — unliked pill must be a circle)
- [ ] `♡` ivory ⇄ `♥` `#d9b866`, count 12px ivory only when non-zero
- [ ] Optimistic toggle, reconciled with server
- [ ] 44px tap height via `min-height:44px; padding-bottom:5px; margin-bottom:-5px` wrapper

## Comments

Decided: unnamed guests can like too — key likes on the device identity
(`src/lib/device.ts`), which exists before any name; the name attaches to the same
identity later at intro.
