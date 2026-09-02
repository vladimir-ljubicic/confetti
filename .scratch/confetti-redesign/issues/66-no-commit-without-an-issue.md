# 66 — Every commit answers to an issue

**What to build:** The rule that no change is committed without an issue file behind
it, written where an agent reads it before it starts work.

**Status:** done

- [x] `docs/agents/issue-tracker.md` states the rule and how to satisfy it: an issue
      file exists before the work starts, and the commit lands with it
- [x] The rule is reachable from `CLAUDE.md`, which is what an agent loads first
- [x] Both read as the current way of working, with no account of the change itself

## Comments

Work has been landing whose only record is a commit subject. The issue files under
`.scratch/confetti-redesign/issues/` are where the reasoning lives — what was seen,
what was measured, what was ruled out — and a commit without one leaves the next
reader the diff and nothing else.

The rule stands at the top of `docs/agents/issue-tracker.md`, above the
conventions it governs, with a line in `CLAUDE.md` under the issue-tracker
heading so an agent meets it before it opens anything else.
