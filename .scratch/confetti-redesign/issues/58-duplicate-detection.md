# 58 — Decision: duplicate-upload detection

**Status:** done

REVIEW §3, flagged "needs a decision". Guests re-pick the same photos after a cancelled
or failed batch; nothing checks, the feed fills with doubles.

**Proposal (cheap fix from the review):** hash files client-side at selection time, skip
ones this guest already uploaded, quiet line "2 фотографије су већ отпремљене, прескачемо
их." Needs: content hash stored per photo, hash at pick time, skip + message in the flow
(`upload-button.tsx` `onFilesSelected`).

Decide: build it, or wontfix for this wedding's scale?

## Comments

Built, as proposed. The pick is hashed (SHA-256 of the bytes) before the batch starts,
`/api/uploads/duplicates` names which of those hashes this device has already put in the
gallery, and the rest of the batch goes up under a quiet line saying how many were left
out. Only a finished, undeleted photo counts, so the cancelled-or-failed batch the review
describes is re-picked whole. A photo the browser cannot hash — `crypto.subtle` is absent
on insecure origins — goes up, as does the whole pick when the check cannot be answered.

`photos.content_hash` (migration 0024) carries the hash, written when the upload is signed.
CONTEXT.md defines the term as **Duplicate skip**.
