@AGENTS.md

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

Nothing is committed without an issue: every change lands with the issue file that
describes it, written before the work starts.

### Triage labels

The five canonical labels, unchanged (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

After changing a decision recorded in `docs/adr/` — reversing it or accepting a new tradeoff — amend that ADR in the same change; applying a recorded decision at a new site is not a change to it. When your work coins a new domain term, define it in `CONTEXT.md`.
