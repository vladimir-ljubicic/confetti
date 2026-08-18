# 10 — Admin auth

**What to build:** Visiting `/admin` prompts for a shared passcode (from an env var). A correct passcode sets a long-lived signed cookie; admin pages are inaccessible without it.

**Blocked by:** 02 — Tracer: upload one photo → see it in gallery.

**Status:** ready-for-agent

- [ ] Correct passcode grants access via long-lived signed cookie
- [ ] Wrong/absent passcode blocks all admin pages and admin APIs
