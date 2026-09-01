# 50 — Brand mark entrance to v3 (1a)

**What to build:** Flecks spring in with sparks; plays once per app load.

**Status:** done

- [x] Entrance: each fleck `av-pop` 0.5s staggered 0.05–0.36s + five `burst` sparks
      0.85s flying outward (today `fleck-fall` 0.9s staggered to 0.62s, no sparks —
      `globals.css:93-117`, `confetti-mark.tsx:29-44`)
- [x] Then `fleck-drift` sway as today
- [x] Once per app load: session flag — today the entrance replays on every wordmark
      remount (`confetti-wordmark.tsx:24`, default `variant="animated"`)
- [x] Static mark in the 10b packing card (`export-download.tsx:153` animates it;
      animated belongs to the header only)

## Comments

README's Motion section still describes `fleck-fall`; ALIGN §2 1a + the board are the v3
authority.

Once per app load is a clock rather than the flag the ticket names. A flag hands the
entrance to whichever mark mounts first, and on a cold load that is the stand-in header
the Suspense fallback renders — it would spend the celebration and unmount mid-pop,
leaving the loaded header settled. Every mark instead pulls its delays back by
`performance.now()`, so the one entrance belongs to the load: the mark that comes up
during it joins it where it has got to and the swap between the two headers is
invisible, and a mark that comes up after it comes up mid-sway. `performance.now()`
resets on a full load and not on a soft navigation, which is the boundary wanted.

The geometry and timings are a table in `src/lib/brand-mark.ts` rather than the
component, so what the design fixes can be checked: the sparks all leave within a fifth
of a second of each other, every one of them flies clear of the mark's own box, and the
sway starts only once the last spark has gone.

The five sparks are the board's, scaled from its 26px mark — the 14px one on 1a draws
only three of them, and ALIGN §2 1a asks for five.

Refs: ALIGN §2 1a; README "The brand mark".
