---
name: end-day
description: End of day wrap-up - summary, sync, commit. Use at end of work session.
user-invocable: true
argument-hint: "[date] (e.g. 'yesterday', '2026-01-08', blank for today)"
allowed-tools: Read, Grep, Edit, Bash(.claude/skills/task-cli/scripts/task-cli.sh:*), Bash(.claude/skills/dates/scripts/date_context.sh:*), Bash(git:*)
---

# End of Day

End of the day - generate a summary of the day's work and the next steps.

**Argument**: Optional date (e.g. "yesterday", "2026-01-08", or blank for today)

## Process

Ask me any questions you think I need to consider now or you need to know to wrap everything up (eg. carrying over tasks from today to tomorrow, planning tomorrow). Once fully done, commit the changes to the repo. Make sure everything that we're working on is recorded in the right places in the project files. Make sure INDEX.md and diary files are up to date.

## Activity Review (IMPORTANT)

**Before** writing the summary, check the task activity feed to see what actually happened today:

```bash
.claude/skills/task-cli/scripts/task-cli.sh activity --since YYYY-MM-DD
```

This shows all task completions, status changes, and notes added — use this to understand what was accomplished rather than relying solely on memory or open tasks.

**Sync Tasks**: Check the task database for any tasks that need status updates based on today's work.

Run the /actionreview skill to review the actions that were completed and the next steps.

**Meeting-Diary Linking**: Before committing, verify all meetings from today are linked from today's diary entry:
- Check for meeting files dated today: `*/meetings/YYYY/MM/YYYY-MM-DD*.md`
- Ensure each has a corresponding link in diary's `## Meetings` section
- If meetings exist but aren't linked, add them

**After midnight**: When this runs in the wee hours (1am-3am) with no argument, the "day" being wrapped is likely YESTERDAY. Check what work was actually done and use judgement. If uncertain, ask which day to wrap up.

Remind me to fill in the timecard and procrastination tracker.

## Email Follow-ups (Optional)

If there are tasks waiting on email responses, or user asks about email:
```bash
.claude/skills/gmail/scripts/gmail-cli.sh search "category:primary is:unread"
```

Check for specific expected replies if relevant:
```bash
.claude/skills/gmail/scripts/gmail-cli.sh search "from:personname newer_than:3d"
```

**Never auto-create tasks from emails** — see gmail skill for proper workflow.

## Working Memory

Before finishing, update `.claude/context/working-memory.md` with any important context that should persist to the next session (decisions made, blockers identified, status changes, things to remember). Trim old entries (>7 days) unless marked [KEEP].

## Project Status Updates

For projects that had significant activity today, update their AI status summary in the README:

```markdown
<!-- AI_STATUS_START -->
**Status Summary** (DD Month YYYY)

**Recent**: What happened recently (1-2 bullet points)
**Current**: What's the overall state right now
**Blocked/Waiting**: Any blockers or things awaited (or "None")
**Next**: Immediate next steps
<!-- AI_STATUS_END -->
```

Place this after the main heading, before `## Overview`. This is the **primary status section** — you can remove redundant "Current Status" sections.

**If you lack context** to write an accurate status update, use `AskUserQuestion` to clarify what's happened, what's blocked, or what's next. Don't guess — ask.

See `content/DOCUMENT-FORMATS.md` for full spec.
