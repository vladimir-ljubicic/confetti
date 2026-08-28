# 21 — Sort toggle: Најновије/Популарно

**What to build:** Relabel + resemantic the sort toggle everywhere it appears (1a, 1b,
6a–6c, 7b, 11a). "Популарно" = like count desc, ties by recency; no more oldest-first.
"Најновије" = newest-first and always the default.

**Status:** ready-for-agent

Server:
- [ ] `src/lib/sort-mode.ts`: modes become `latest | popular`; default always `latest` —
      delete the wedding-day date flip (and its hardcoded date)
- [ ] `src/lib/public-photos.ts`: `popular` → `order(like_count desc, uploaded_at desc)`;
      `latest` stays `uploaded_at desc`. Oldest-first (`effective_taken_at asc`) ordering
      goes away
- [ ] Accept legacy `?sort=live|chrono` params gracefully (fall back to default)

Client:
- [ ] `dictionaries.ts`: replace both sort strings in both locales —
      СР "Најновије"/"Популарно", EN "Latest"/"Popular"
- [ ] Viewer swipe order follows active sort — already true (viewer gets the grid array),
      just verify

## Comments

Decided: default is always Најновије — the post-wedding default flip is removed entirely.
No `like_count` index needed at current scale (200-photo page cap).
