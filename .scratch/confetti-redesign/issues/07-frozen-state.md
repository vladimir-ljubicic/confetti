# 07 — Frozen gallery (1b)

**What to build:** Restyle the existing freeze state per 1b: pinned thank-you notice under
the compact bar (`#f1eadb`, static 20px mark, "Хвала вам!" + explanation), and the floating
button becomes secondary ("Преузми све фотографије") opening the guest variant of the
download sheet (issue 18 — no "Приватне" row; guest zip is the public gallery).

**Blocked by:** 04, 18 (button target)

**Status:** done

- [x] Notice card sticky under compact bar, copy per README
- [x] Secondary button style: `#fffdf8` fill, hairline border, `#8a6d2c` label
- [x] Uses existing `uploads_frozen` flag (auto-set 7 days after event — issue 18);
      masthead behaviour identical to 1a
- [x] Button resolves the public zip via the stable `GET /api/export/public` endpoint;
      shows the 13b "preparing" card if the build is still running

## Comments
