# ADR-0001: Cookie-based locale, no `[lang]` routing

## Status

Accepted

## Context

The UI is Serbian-first with an English toggle that persists per device. The
Next.js i18n guide recommends `[lang]` sub-path routing plus `Accept-Language`
negotiation.

## Decision

Locale lives in a `confetti_locale` cookie read server-side; every route keeps
a single URL. New visitors get Serbian regardless of browser language.

## Consequences

- The gallery URL guests receive (e.g. via QR code) is identical for everyone
  and never redirects; a shared link renders the recipient's own saved locale,
  not the sender's.
- Serbian default is a product requirement, so `Accept-Language` negotiation
  is deliberately not consulted.
- Dictionaries stay server-only; client components receive the strings they
  render as props.
