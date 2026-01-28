---
name: timecard
description: Calculate client time split for billing. Use at 5pm or end of day.
user-invocable: true
argument-hint: "[date] (default: today)"
allowed-tools: Read, Grep, Bash(personal/invoicing/scripts/*:*)
---

# Timecard

Calculate the split of time across clients for billing purposes.

**When to use**: At the end of a work session (typically ~5pm) or during `/end-day`

## Data Location

- CSV file: `personal/invoicing/timecard.csv` (in content repo)
- Scripts: `personal/invoicing/scripts/add_time.sh`

The CSV format is:
```csv
date,client,hours,tasks
2026-01-28,acme-corp,4.5,"Reviewed budget, prepared presentation"
2026-01-28,example-org,3.5,"Grid monitoring updates"
```

## Process

1. **Check the date** first:
   ```bash
   .claude/skills/dates/scripts/date_context.sh
   ```

   **After midnight (before 3am)**: Ask the user which day they want to record time for - they likely mean yesterday, not today.

2. **Review the day's work** using task activity:
   ```bash
   tcli activity --since YYYY-MM-DD
   ```

3. **Calculate time split** based on:
   - Completed tasks and their projects/orgs
   - Time spent on each client's work
   - Round to nearest 0.5 hours

4. **Record the entry** using the add_time script:
   ```bash
   personal/invoicing/scripts/add_time.sh YYYY-MM-DD client hours "task summary"
   ```

   Or append directly to CSV (ensure proper quoting for task descriptions with commas).

5. **Verify** the entry was recorded correctly:
   ```bash
   tail -5 personal/invoicing/timecard.csv
   ```

## Tips

- Total hours per day should typically be 7-8 (or match actual work hours)
- Split partial days proportionally between clients
- Include brief task descriptions for invoicing reference
- The web UI at `/timecard` shows historical data and summaries
