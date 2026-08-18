# 10 — Admin auth

**What to build:** Visiting `/admin` prompts for a shared passcode (from an env var). A correct passcode sets a long-lived signed cookie; admin pages are inaccessible without it.

**Blocked by:** 02 — Tracer: upload one photo → see it in gallery.

**Status:** ready-for-agent

- [x] Correct passcode grants access via long-lived signed cookie
- [x] Wrong/absent passcode blocks all admin pages and admin APIs

## Comments

Implemented: `ADMIN_PASSCODE` env var; `/admin` renders a passcode form
(server action, works without JS) or the signed-in view. Cookie
`confetti_admin` is `<issuedAtMs>.<HMAC-SHA256>` signed with the passcode
itself, so rotating the passcode revokes all sessions; 400-day maxAge with
expiry re-checked on verify (`src/lib/admin-token.ts`, timing-safe compares,
unit-tested). `isAdmin()`/`grantAdminSession()` in `src/lib/admin-session.ts`
are the guard for pages/APIs; `src/proxy.ts` additionally fails closed on
`/admin/:path+` (redirect → `/admin`) and `/api/admin/*` (403) so future admin
routes are blocked even without their own check. Verified via curl: login sets
cookie + 303, wrong passcode re-renders with error, tampered cookie blocked,
proxy guard 307/403 without cookie and passes with a valid one.
