---
name: working-memory
description: Maintain running context notes in working-memory.md. Use this skill to record important context, decisions, blockers, and status changes. Triggered automatically at end of day, during summaries, when user shares important information, or when compacting. Also use to read current context at session start.
allowed-tools: Read, Edit, Write, Bash(date:*)
---

# Working Memory Management

Private scratchpad for maintaining context across sessions. **User does not read this** — be candid.

## File Location

`.claude/context/working-memory.md` (auto-loaded every message)

## What to Record

**Operational context:**
- Blockers, awaiting-input states, pending decisions
- Deadlines and time-sensitive items
- Status of in-flight work

**Observations & reflections:**
- User preferences and working patterns I've noticed
- Things that seem off or concerning (missed deadlines, avoidance patterns)
- Strategic notes about priorities or approach

**Planning notes:**
- Things to raise or check on
- Reminders to self about how to handle situations
- Questions to ask when opportunity arises

## What NOT to Record

- Event records (→ diary)
- Completed items (delete once done)
- Duplicates of Todoist tasks or README content

## Entry Format

```
[YYYY-MM-DD] [Project?] Note content here
```

Examples:
- `[2026-01-08] [SV USA] Awaiting John's input on 4 questions (Fri 10 Jan).`
- `[2026-01-08] [Career] User says gentle nudges OK — help keep it moving.`
- `[2026-01-08] [Observation] Invoices have been overdue 3x now — might need reminder system.`

## When to Update

1. **User shares important info** — preferences, decisions, blockers
2. **End of day** — capture context before session ends
3. **After summaries** — note new insights or status changes
4. **Before compacting** — save critical context
5. **When I notice patterns** — observations worth remembering

## Maintenance — RUTHLESS TRIMMING

1. Delete entries >7 days old (unless still actively relevant)
2. Delete records of what happened (diary's job)
3. Delete completed/resolved items
4. Delete duplicates of Todoist/README content
5. Consolidate repetitive entries into single current-state notes
6. **When in doubt, delete** — this is a scratchpad, not an archive
7. One line per note — keep it scannable

## Integration Points

- `/end-day` — update before wrapping up
- `/summary` — update with new insights
- `/resumeday` — review auto-loaded context
- PreCompact hook — save critical context before compacting
