---
name: commit
description: Git commit workflow with database sync.
allowed-tools: Bash(.claude/skills/commit/scripts/commit.sh:*), Bash(git:*)
---

# Commit Skill

Commit changes from the content directory without needing to know about the monorepo structure.

## Pre-commit Check
Before committing, run the session review skill to catch stale task references:
- Use `/session-review` or follow `.claude/skills/session-review/SKILL.md`
- Fix any flagged mismatches before proceeding with the commit

## Usage

```bash
# Commit all content changes with a message
.claude/skills/commit/scripts/commit.sh "Your commit message"

# Commit specific files
.claude/skills/commit/scripts/commit.sh "Your commit message" diary/2026/01/17-Sat.md

# Show what would be committed (dry run)
.claude/skills/commit/scripts/commit.sh --dry-run "Message"
```

## What It Does

1. Changes to the repository root (parent of content/)
2. Stages only files within content/
3. Creates a commit with the provided message
4. Returns status

## Notes

- Only commits files in the content/ directory
- Does not push to remote
- Safe to use without understanding the full repo structure
