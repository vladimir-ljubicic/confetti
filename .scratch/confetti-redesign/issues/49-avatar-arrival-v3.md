# 49 — Avatar arrival to v3 motion (4a)

**What to build:** The build matches old README 12a; ALIGN 4a asks for more.

**Status:** done

- [x] Gold ring pulse: `av-ring` 1.9s infinite (keyframe does not exist)
- [x] Eight sparks on a repeating 4s `burst-cycle` (today five flecks × 2 then stop,
      `gallery-header.tsx:42-48`, `globals.css:174`)
- [x] Coach mark nudges every 3.2s (`hint-nudge`), arrow scales (`hint-arrow`) — neither
      exists
- [x] Sort toggle dimmed to 28% while the coach mark is up, back to full on dismiss
      (`gallery-header.tsx:287` has no coupling)
- [x] `av-pop` 0.62s at 0.15s (today 0.55s, `globals.css:170`)
- [x] All guarded by `prefers-reduced-motion`

Refs: ALIGN §2 4a.

## Comments

The eight sparks are a table in `src/lib/avatar-burst.ts` rather than the component, so
what the design fixes can be checked: they all leave within a third of a second of each
other, so the burst reads as one explosion, and none of them flies further right than
the header's gutter — the widest clears it by two pixels.

The coach mark's nudge and its arrow share one 3.2s beat, delayed 0.65s so the entrance
finishes first; the mark is already mounted late, so the delays are relative to that
rather than to the avatar's pop.

The arrow sets its base angle with `[transform:rotate(45deg)]`. Tailwind's `rotate-45`
compiles to the separate `rotate` property, which composes with the `transform` the
`hint-arrow` keyframes set instead of yielding to it, standing the diamond at 90°.

`.new-photos-in` no longer shares a rule with the coach mark: the pill enters and stays
put, while the mark goes on nudging.
