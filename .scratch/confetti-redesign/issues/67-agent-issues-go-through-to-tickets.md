# 67 — Issues an agent files itself go through to-tickets

**What to build:** The rule that an agent deciding on its own to file issues breaks the
work down the way `to-tickets` does, rather than inventing a shape per session.

**Status:** done

- [x] `docs/agents/issue-tracker.md` states when the rule applies — the agent's own
      initiative, not a breakdown the user dictated or invoked the skill for
- [x] It says to read `.claude/skills/to-tickets/SKILL.md` and follow it, since the
      skill is user-invocable only and cannot be reached with the Skill tool
- [x] It names what the skill is being followed for: vertical slices, blocking edges,
      human tasks as tickets of their own, and the breakdown put to the user before
      anything is written
- [x] It reads as the current way of working, with no account of the change itself

## Comments

The issue files are the record the next reader works from, and one filed off the cuff
lands as a note rather than a ticket: no blocking edges, no slice that stands on its
own, nothing put to the user before it was written. The skill already settles all of
that; what was missing is the line saying an agent reaches for it unprompted.

The rule sits under the commit rule in `docs/agents/issue-tracker.md`, which is
where an agent is already looking when it is about to write an issue file, with a
line in `CLAUDE.md` pointing at the skill by path.

Stated by path rather than as a skill to invoke: `to-tickets` carries
`disable-model-invocation: true`, so the Skill tool will not reach it and reading
the file is the only way in.
