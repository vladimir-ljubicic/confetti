# 08 — Intro bottom sheet (4a)

**What to build:** Redesign the first-upload dialog as a bottom sheet shown **after** file
picking (a step, not a gate). Gallery blurred 3px at 0.5 opacity under `rgba(43,38,32,0.42)`
scrim. Sheet `#fffdf8`, radius `28px 28px 36px 36px`, grab handle.

**Blocked by:** 01, 02

**Status:** done

- [x] Heading block: static 22px mark, "Представите се" 30px Cormorant, explainer with the
      deliberate `<br>`
- [x] Side-by-side name fields: "ИМЕ" (required) / "ПРЕЗИМЕ · необавезно"; focused state
      1px `#b08d3c` + `#faf6ee` fill
- [x] Visibility as two selectable cards ("Сви гости" / "Само младенци"); selected =
      1.5px `#b08d3c` + `#f7f0df`
- [x] Primary "Сачувај и отпреми N фотографије" with interpolated count; "Откажи" 44px
- [x] On save: persist name locally, close, start upload, trigger avatar arrival (issue 14)
- [x] Shown only on first upload; later uploads go straight to 6a/6b

## Comments
