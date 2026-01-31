---
name: session-review
description: Audit modified files for stale task references before committing.
allowed-tools: Bash(git:*), Bash(.claude/skills/task-cli/scripts/task-cli.sh:*)
---

# Session Review

Review modified files for consistency before committing. Catches stale task statuses that were copied from narrative sources instead of queried from the database.

## When to Run
- Before committing (end of session / end of day)
- The `/commit` skill instructs the agent to run this first

## Steps

1. Run `git diff --name-only` in the content directory to find modified files
2. For each changed `.md` file:
   - Extract all task references matching `T-\d+`
   - Collect unique IDs
3. If any task IDs found, run `tcli get <comma-separated-ids>` to batch-query current statuses
4. Compare: for each task ID mentioned in a file, check if the status written in the file matches the DB status. Flag mismatches.
5. Check modified project `README.md` files:
   - Compare frontmatter `status:` against DB project status
   - Flag if different
6. Present findings to user:
   - List of mismatches with file, line, written status, actual status
   - Propose edits to fix
7. After user approves fixes, apply them

## Output
Concise report. No changes without user confirmation.
