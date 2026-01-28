---
name: summary
description: Daily summary of accomplishments, task status, and project updates.
user-invocable: true
allowed-tools: Read, Grep, Edit, Bash(.claude/skills/task-cli/scripts/task-cli.sh:*), Bash(.claude/skills/dates/scripts/date_context.sh:*), Bash(.claude/skills/google/scripts/google-cli.sh:*)
---

# Daily Summary

Generate a summary for today's work. Include a summary of my current projects and priorities and tasks. If you think I have missed something, ask me questions.

If today's diary file doesn't exist, create it. Review today AND yesterday's diary entries. Make sure you review personal/routines.md for any recurring tasks or reminders.

## Task Queries

When gathering tasks for the summary, run ALL of these:
- `.claude/skills/task-cli/scripts/task-cli.sh today` — tasks due today or with today's attention date
- `.claude/skills/task-cli/scripts/task-cli.sh overdue` — overdue tasks
- `.claude/skills/task-cli/scripts/task-cli.sh checkins` — tasks with check-ins due (**these count as today's tasks**)
- `.claude/skills/task-cli/scripts/task-cli.sh routines due` — today's routines
- `.claude/skills/task-cli/scripts/task-cli.sh activity --since YYYY-MM-DD` — **activity feed showing what happened today** (status changes, completions, notes)

The activity feed is essential for understanding what was accomplished — it shows task completions, status changes, and notes added. Use today's date for `--since`.

Check-ins are scheduled review points for tasks — they surface tasks that need attention even if not "due" today.

## Email Review

**Always** check emails as part of the daily summary.

### Gmail Commands

| Command | Purpose |
|---------|---------|
| `search "query"` | Find emails |
| `get MESSAGE_ID` | Read one email (NOT `message`) |

```bash
# 1. Search primary inbox (not archived) - includes read and unread
.claude/skills/google/scripts/google-cli.sh gmail search "category:primary in:inbox newer_than:2d"

# 2. Read specific email by ID from search results
.claude/skills/google/scripts/google-cli.sh gmail get MESSAGE_ID
```

**Process emails to identify:**
- New action items that could become tasks
- Replies that might update existing tasks
- Emails related to current projects/tasks

### PROPOSE Changes, Don't Make Them

**Never create or update tasks from emails without asking.**

1. Summarise what you found
2. Propose specific changes (new tasks, status updates, etc.)
3. Use `AskUserQuestion` to get confirmation
4. Only make changes after user confirms

**Example:**
```
Based on your emails, I'd suggest:

1. **New task:** "Review budget for John" (due Fri)
   → From John's email requesting Q1 budget review

2. **Update T-1234:** Unblock and resume
   → Sarah's reply confirms project is approved

3. **FYI (no action):** HR holiday schedule

Which of these would you like me to do?
```

**Link emails to existing tasks:** If an email relates to an existing task, propose updating that task rather than creating a new one.

**Wait for confirmation before making any changes.**

## Project Status Updates

For projects that had activity today (including email correspondence), update their README:

**Check gmail for each active project:**
```bash
.claude/skills/google/scripts/google-cli.sh gmail search "subject:project-name newer_than:2d"
```

**Include email context in Current Status:**
- "🟢 **Budget approval** — John confirmed via email (28 Jan)"
- "⏳ **Legal review** — awaiting response from Sarah (email sent 25 Jan)"
- "🟡 **Timeline concerns** — James raised issues in email, need to address"

**PROPOSE README updates** and ask user to confirm before editing.

Update the status summary in the README:

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

## Next Steps

Consider all my current projects, stated priorities and the tasks in the task database. Then provide me with a summary and the next steps. If you think I am missing something (eg one project is very high priority but I haven't got a task for it) then please ask me questions.

**Prioritization criteria:**
1. **Overdue** items always surface first
2. **Due today** items come next
3. **High priority** (P1, P2) items regardless of due date
4. **Blocked** items to identify what can be unblocked
5. **Check-ins due** — scheduled review points

For each next step, briefly note:
- The task/action
- Why it's prioritized (overdue, high priority, blocking other work, etc.)
- Any context needed to resume

## Working Memory

After generating the summary, update `.claude/context/working-memory.md` with any new insights, status changes, or important context discovered during the summary process.
