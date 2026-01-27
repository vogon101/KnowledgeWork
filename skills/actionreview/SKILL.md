---
name: actionreview
description: Audit pending actions, commitments, and quality issues across tasks and meetings.
user-invocable: true
argument-hint: "[scope] (e.g. 'acme-corp', '2 weeks')"
allowed-tools: Read, Grep, Glob, Bash(.claude/skills/task-cli/scripts/task-cli.sh:*), Bash(.claude/skills/dates/scripts/date_context.sh:*), Bash(.claude/skills/projects/scripts/*:*)
---

# Action Review

Review pending actions, commitments, and owed items across meetings, projects, and the task database.

## Parameters

- **Argument** - Optional: project name(s) or time period (e.g., "acme-corp", "2 weeks", "example-org acme-corp")

## Instructions

### 0. Get Date Context

**FIRST: Get date context** — never calculate dates mentally:

```bash
.claude/skills/dates/scripts/date_context.sh
```

Use these dates when calculating time periods. For offsets (e.g., 2 weeks ago): `.claude/skills/dates/scripts/date_context.sh offset -14`

### 1. Parse Arguments

Default scope:
- **Time period**: 2 weeks
- **Projects**: All

If argument provided:
- Number + "weeks"/"days" → adjust time period
- Project names → filter to those projects only

### 2. Gather Data

**CRITICAL: Always query the task database for status — never assume from meeting notes or memory.**

**A. Query Task Database (Source of Truth)**

```bash
# Overdue tasks
.claude/skills/task-cli/scripts/task-cli.sh overdue

# Due today
.claude/skills/task-cli/scripts/task-cli.sh today

# Due tomorrow / this week
.claude/skills/task-cli/scripts/task-cli.sh list --due tomorrow
.claude/skills/task-cli/scripts/task-cli.sh list --due this-week

# Blocked tasks
.claude/skills/task-cli/scripts/task-cli.sh blocked

# Waiting on others (tasks owned by others)
.claude/skills/task-cli/scripts/task-cli.sh list --status pending | grep -v "Alice"

# Check-ins due
.claude/skills/task-cli/scripts/task-cli.sh checkins

# Get specific task status (if unsure)
.claude/skills/task-cli/scripts/task-cli.sh get T-XXX
```

**B. Scan Meeting Actions (Cross-Reference Only)**

Find meetings in the time period to cross-reference with task DB:
```bash
find */meetings -name "*.md" -mtime -14 -type f
```

For each meeting with actions:
- Check if actions have Task IDs in the table
- If Task ID exists, verify status in DB with `tcli get T-XXX`
- If no Task ID, flag as potentially missing from DB

**C. Review Project next-steps.md**

For each active project, check `next-steps.md` for:
- Blockers
- Pending items
- Waiting-on items from others

**D. Review personal routines.md**

Check `personal/routines.md` for:
- Recurring tasks
- Deadlines
- Key reminders

### 3. Compile Report

Output format:

```markdown
# Action Review - [Date]

**Period**: [X weeks] | **Projects**: [list or "All"]

## 🔴 Overdue Actions

| Source | Owner | Action | Due | Age |
|--------|-------|--------|-----|-----|
| [meeting/project] | Name | Description | Date | X days |

## 🟡 Pending Actions (No Due Date)

| Source | Owner | Action | Notes |
|--------|-------|--------|-------|

## 🟢 Actions Owed BY Others

| Source | Owner | Action | Status |
|--------|-------|--------|--------|

## ⚠️ Potential Conflicts/Gaps

- [Meeting actions without Task IDs - not synced to DB]
- [Tasks without project assignment]
- [Stale items >2 weeks old without activity]

## 📋 Task Database Summary

[Count by status, project breakdown, high priority items]
```

### 4. Review Task Quality

Check task titles and assignments:

**Titles**: Should be clear and actionable
- ❌ "SV USA project plan - framework complete, need boss validation"
- ✅ "SV USA: Project plan sign-off"
- ❌ "Come back to John with proposal (blocks T-8)"
- ✅ "Come back to John with proposal" (use `--blocked-by` for relationships)

**Blocking relationships**: Use `--blocked-by`, not parenthetical notes in titles

**Flag tasks that need:**
- Verbose titles with status baked in
- Missing project assignment
- Blocking text in title instead of proper relationship
- Unclear references (people, acronyms) — add to working memory People Reference

### 5. Review Meeting Quality

Scan meetings for issues:

**A. Diary Linking**
- Meetings not linked from any diary entry
- Compare meeting dates against `diary/YYYY/MM/DD-DOW.md` entries

**B. Frontmatter Issues**
- Missing required fields (title, date, attendees)
- `status: scheduled` but date is in the past (stale)
- Missing `project` field

**C. Structure Issues**
- No Actions table (for completed meetings)
- Actions without status values
- Missing "Related" section

**D. Project Reference Validation**
Get valid project slugs:
```bash
.claude/skills/projects/scripts/valid_slugs.sh
```

Then check for invalid references:
- Frontmatter `project:` field using org names (`acme-corp`, `example-org`)
- Frontmatter `projects:` array with invalid slugs
- Actions table Project column with invalid slugs
- Non-existent slugs (verify against discovered list)

**E. Cross-Reference Issues**
- Meeting actions without Task IDs (not synced to database)
- Tasks with source meeting that no longer exists

Output format:
```markdown
## 📝 Meeting Quality Issues

| Meeting | Issue |
|---------|-------|
| path/to/meeting.md | Not linked from diary |
| path/to/meeting.md | Status: scheduled but date 2026-01-06 is past |
| path/to/meeting.md | Missing Actions table |
| path/to/meeting.md | Invalid project reference: `nuclear` (should be `analytics-dashboard`) |
| path/to/meeting.md | Org name used as project: `acme-corp` |
```

### 6. Offer Follow-ups

After presenting the report, offer:
1. Sync unsynced meetings to task database
2. Update action statuses in meeting notes
3. Chase items owed by others (draft message)
4. Complete/close finished items
5. Fix task titles with blocking text (use `--blocked-by` instead)
6. Add missing project assignments
7. Link unlinked meetings to diary entries
8. Update stale meeting statuses (scheduled → completed)
9. Add missing frontmatter fields to meetings
10. Fix invalid project references (show valid slugs, offer to correct)

Use the Ask User Question tool to ask me about the issues/gaps you identify.
