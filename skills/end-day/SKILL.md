---
name: end-day
description: End of day wrap-up - summary, sync, commit. Use at end of work session.
user-invocable: true
argument-hint: "[date] (e.g. 'yesterday', '2026-01-08', blank for today)"
allowed-tools: Read, Grep, Edit, Bash(.claude/skills/task-cli/scripts/task-cli.sh:*), Bash(.claude/skills/dates/scripts/date_context.sh:*), Bash(.claude/skills/google/scripts/google-cli.sh:*), Bash(git:*)
---

# End of Day

End of the day - generate a summary of the day's work and the next steps.

**Argument**: Optional date (e.g. "yesterday", "2026-01-08", or blank for today)

## Process

Ask me any questions you think I need to consider now or you need to know to wrap everything up (eg. carrying over tasks from today to tomorrow, planning tomorrow). Once fully done, commit the changes to the repo. Make sure everything that we're working on is recorded in the right places in the project files. Make sure diary files are up to date.

## Activity Review (IMPORTANT)

**Before** writing the summary, check the task activity feed to see what actually happened today:

```bash
.claude/skills/task-cli/scripts/task-cli.sh activity --since YYYY-MM-DD
```

This shows all task completions, status changes, and notes added — use this to understand what was accomplished rather than relying solely on memory or open tasks.

**Sync Tasks**: Check the task database for any tasks that need status updates based on today's work.

Run the /actionreview skill to audit pending actions across tasks, meetings, and email — it identifies overdue items, unsynced meeting actions, email action items, and stale project READMEs.

**Meeting-Diary Linking**: Before committing, verify all meetings from today are linked from today's diary entry:
- Check for meeting files dated today: `*/meetings/YYYY/MM/YYYY-MM-DD*.md`
- Ensure each has a corresponding link in diary's `## Meetings` section
- If meetings exist but aren't linked, add them

**After midnight**: When this runs in the wee hours (1am-3am) with no argument, the "day" being wrapped is likely YESTERDAY. Check what work was actually done and use judgement. If uncertain, ask which day to wrap up.

Remind me to fill in the timecard.

## Focus Rating

After timecard, record the daily focus rating:

1. **AI Assessment**: Based on today's activity, assess focus (1-5):
   - Consider: tasks completed vs planned, time on priorities, deferrals
   - Note patterns (morning focus, afternoon slump, etc.)
   - 1 = Very distracted, little progress
   - 2 = Struggled to focus, some progress
   - 3 = Mixed focus, moderate progress
   - 4 = Good focus, solid progress
   - 5 = Excellent focus, highly productive

2. **Ask User**: Use AskUserQuestion:
   - "How would you rate your focus today? (1=very distracted, 5=very focused)"
   - "Any notes about your focus?" (optional)

3. **Record** the focus entry:
   ```bash
   tcli focus --user [X] --ai [Y] --notes "[user notes]" --ai-notes "[AI observations]"
   ```

The focus tracker is viewable at `/timecard` (Focus Tracker tab) or via `tcli focus-summary`.

## Calendar & Email Review

Check calendar and emails using the google skill. See @.claude/skills/google/SKILL.md for command reference.

```bash
.claude/skills/google/scripts/google-cli.sh calendar today
.claude/skills/google/scripts/google-cli.sh calendar upcoming --days 2
.claude/skills/google/scripts/google-cli.sh gmail search "category:primary in:inbox newer_than:2d"
```

Note any meetings that happened today and flag tomorrow's meetings that need prep.

Also check for expected replies on waiting tasks:
```bash
.claude/skills/google/scripts/google-cli.sh gmail search "from:personname newer_than:3d"
```

Process emails to identify action items, task updates, and follow-ups needed tomorrow.

**Propose changes, don't make them** — summarise findings, use `AskUserQuestion`, wait for confirmation before creating/updating tasks.

## Working Memory

Before finishing, update `.claude/context/working-memory.md` with any important context that should persist to the next session (decisions made, blockers identified, status changes, things to remember). Trim old entries (>7 days) unless marked [KEEP].

## Project Status Updates (MANDATORY)

For each active project with today's activity (tasks, emails, meetings), check and update its README status block. See the "Project READMEs" section in @FRAMEWORK-INSTRUCTIONS.md for the update process and template.

Search gmail per project for recent correspondence:
```bash
.claude/skills/google/scripts/google-cli.sh gmail search "subject:project-name newer_than:2d"
```

Propose README updates and confirm with user before editing.

See `content/DOCUMENT-FORMATS.md` for full spec.
