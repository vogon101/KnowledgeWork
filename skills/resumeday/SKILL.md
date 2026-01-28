---
name: resumeday
description: Morning check-in - restore context and review today's tasks.
user-invocable: true
allowed-tools: Read, Grep, Bash(.claude/skills/task-cli/scripts/task-cli.sh:*), Bash(.claude/skills/dates/scripts/date_context.sh:*), Bash(.claude/skills/google/scripts/google-cli.sh:*)
---

# Resume Day

Resume a working session. Quick morning check-in to restore context.

## Check-in Steps

1. **Working Memory** - Already auto-loaded from `.claude/context/working-memory.md`. Review it for context.

2. **Diary** - Read today's diary file. If it doesn't exist, create it from yesterday's template.

3. **Last session** - What was I working on? Any incomplete tasks or actions?

4. **Task DB** - Check tasks using the CLI:
   - `.claude/skills/task-cli/scripts/task-cli.sh today` — tasks due today or with today's attention date
   - `.claude/skills/task-cli/scripts/task-cli.sh overdue` — overdue tasks
   - `.claude/skills/task-cli/scripts/task-cli.sh checkins` — tasks with check-ins due (these are also "today's tasks")
   - `.claude/skills/task-cli/scripts/task-cli.sh routines due` — today's routines
   - `.claude/skills/task-cli/scripts/task-cli.sh activity --limit 20` — recent activity to see what happened since last session

5. **Projects** - Any urgent items or blockers from INDEX.md?

6. **Email & Calendar Review** - Check schedule and inbox:

   ```bash
   # Check today's calendar
   .claude/skills/google/scripts/google-cli.sh calendar today

   # Search primary inbox (not archived) - includes read and unread
   .claude/skills/google/scripts/google-cli.sh gmail search "category:primary in:inbox newer_than:2d"

   # Read specific email by ID
   .claude/skills/google/scripts/google-cli.sh gmail get MESSAGE_ID
   ```

   **Process to identify:**
   - Today's meetings and schedule
   - Urgent items needing attention today
   - Replies that might update existing tasks
   - New action items

   ### PROPOSE Changes, Don't Make Them

   **Never create or update tasks from emails without asking.**
   Summarise findings, propose changes, use `AskUserQuestion`, wait for confirmation.

## Output

Provide a quick summary:
- What was done earlier today (if anything)
- What's outstanding for today (include check-ins!)
- Any urgent items needing attention
- Suggested next action

Keep it concise - this is a quick check-in, not a full summary.
