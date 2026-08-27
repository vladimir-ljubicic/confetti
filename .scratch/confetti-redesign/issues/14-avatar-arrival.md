# 14 — Avatar arrival + coach mark (12a)

**What to build:** One-time sequence when the intro sheet closes and the avatar first appears:
`av-pop` scale-in, five confetti flecks `burst` ×2 (vectors biased left/down per README so
nothing clips), then coach mark "Ваше фотографије су овде" drops in (`hint-in`, 0.5s after
0.75s) with rotated-square arrow pointing at the avatar.

**Blocked by:** 03, 08

**Status:** done

- [ ] Keyframes/timings/vectors verbatim from README motion section
- [ ] Coach mark dismissed on tap, on scroll, or after 6s; `coachMarkSeen` flag persisted —
      never shown again
- [ ] `prefers-reduced-motion` → skip animations, avatar just appears (coach mark may still
      show statically)

## Comments
