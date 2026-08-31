# 08 — Batched, resumable bulk actions on my-photos

**What to build:** A guest hiding, publishing or deleting a selection of their
own photos goes through the bounded, resumable move path of issue 07 instead
of one request per photo fired all at once. A selection of a few hundred
photos previously meant that many parallel invocations, each moving
renditions — the same burst against the storage service's connection pool
that issue 07 removed from the admin.

**Status:** done

- `POST /api/my-photos/visibility` `{ ids, visibility }` and
  `POST /api/my-photos/delete` `{ ids }` each handle 40 photos of the
  selection per request and answer `{ done, remaining }`, where `remaining`
  counts the selected photos that still need the change. The client sends the
  same selection until nothing remains. Ids the guest does not own, or that
  are gone, are ignored.
- `resolveSelection` pages through the guest's live photos so a response cap
  cannot drop part of a large selection; `parseSelection` caps a request at
  the gallery's 10,000 photos.
- The my-photos action bar drives both through `useBulkAction`, showing
  `{done} of {total}` in the running button. A failed request keeps the count
  and the selection on screen; tapping again continues from where it stopped.
- The viewer's single-photo toggle keeps using `PATCH /api/photos/[id]`.

## Acceptance

- [ ] Hiding or deleting a 250-photo selection completes with progress on the
      free-tier dev project.
- [ ] A request that fails part-way leaves every row consistent with where its
      renditions are; a second tap finishes the job.
- [x] Unit tests cover selection parsing and the paged lookup.
