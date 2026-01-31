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

## Calendar & Email Review

Check calendar and emails using the google skill. See @.claude/skills/google/SKILL.md for command reference.

```bash
.claude/skills/google/scripts/google-cli.sh calendar today
.claude/skills/google/scripts/google-cli.sh calendar upcoming --days 2
.claude/skills/google/scripts/google-cli.sh gmail search "category:primary in:inbox newer_than:2d"
```

Include today's meetings in the summary — note which happened, any outcomes or follow-ups.

Process emails to identify new action items, task updates, and project-related correspondence.

**Propose changes, don't make them** — summarise findings, use `AskUserQuestion`, wait for confirmation before creating/updating tasks.

## Project Status Updates (MANDATORY)

For each active project with today's activity (tasks, emails, meetings), check and update its README status block. See the "Project READMEs" section in @FRAMEWORK-INSTRUCTIONS.md for the update process and template.

Search gmail per project for recent correspondence:
```bash
.claude/skills/google/scripts/google-cli.sh gmail search "subject:project-name newer_than:2d"
```

Propose README updates and confirm with user before editing.

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
