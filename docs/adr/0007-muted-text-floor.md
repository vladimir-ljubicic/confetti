# ADR-0007: A measured contrast floor for muted text

## Status

Accepted. Resolves the open question in
`.scratch/confetti-redesign/issues/57-text-floor-ruling.md`.

## Context

The design handoff gives two answers about how faint secondary text may go.
The token block sets a floor — muted text no lighter than
`rgba(43,38,32,0.55)`, nothing under 12px — and cites WCAG AA on ivory as the
reason. The board it describes is drawn on 11px eyebrows and meta lines,
`0.45` opacities and 10px badges, and names a 10px badge in the same document
as the floor.

Measured against `#faf6ee`, that floor does not reach what it is asked to do:
ink at `0.45` reads 2.66:1 and ink at `0.55` reads 3.45:1, both under the
4.5:1 AA wants for text below 24px. Holding the app to it is a sweep of every
screen that still fails the standard it cites.

Small gold text already has an answer here: `--color-gold-small` exists
because `--color-gold` reads 2.90:1 on ivory.

## Decision

Contrast is the rule; the pixel sizes are not.

One token, `--color-ink-muted`, carries every muted word in the app. It is
`rgba(43,38,32,0.68)` — the lightest ink that clears 4.5:1 on every ivory
surface the app sets text on, rather than the lightest that clears it on the
page alone. The binding one is the admin tab strip's `sand-deep` track, the
darkest of them, which an alpha of `0.67` misses at 4.49:1. Ink lighter than
the token is for scrims, borders
and fills only, and takes its alpha on the property that paints it: a hairline
rule is `bg-ink/30`, never a `text-ink/30` the rule inherits through
`bg-current`. Ink darker than the token is a deliberate step up the hierarchy
and stays where it is.

Text on the dark surfaces — the photo viewer, the scrub rail, the private
badge — is outside the token and reads against its own ground.

There is no size floor. Uppercase tracked eyebrows are 11px and the private
badge is 10px, both ceremonial and both far above AA on their own surface.
11px eyebrows on ivory are set in `gold-small`.

`src/lib/contrast.ts` holds the WCAG relative-luminance and contrast-ratio
maths. It is a design-token guard rather than something a screen calls, so its
only caller is `contrast.test.ts`, which reads the palette straight out of
`globals.css`. It holds muted ink above AA on every ivory surface and at the
lightest alpha that manages it, holds the other text colours above AA on the
page and raised surfaces, and fails on any `text-ink` utility under the floor
anywhere in `src/app`. The floor is a test, not a convention.

## Consequences

- Muted text is one shade. The darker steps that remain read as hierarchy,
  and there is no second muted shade to drift between.
- Adding a colour to the palette and setting it on text fails the guard until
  it clears AA; lowering `--color-ink-muted` fails it too, as does reaching
  for a lighter ink on a screen.
- Faint ink can only reach the page as a fill, so a rule or a scrim states its
  own alpha instead of borrowing the text colour of whatever contains it.
- The masthead's italic conjunction is `gold` at 31px and reads 2.90:1, under
  the 3:1 AA asks of text that size. It is the signature of the ceremonial
  masthead and stands.
- `gold-small` clears AA on the page and raised surfaces but not on the sunken
  ones a pill button presses to, so the guard covers the other text colours on
  those two surfaces only. Issue 63 is open on it, and settling it is what
  widens the guard to every colour on every surface.
