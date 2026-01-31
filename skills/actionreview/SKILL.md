---
name: actionreview
description: Audit pending actions, commitments, and quality issues across tasks, meetings, and email.
user-invocable: true
argument-hint: "[scope] (e.g. 'acme-corp', '2 weeks')"
allowed-tools: Read, Edit, Grep, Glob, AskUserQuestion, Bash(.claude/skills/task-cli/scripts/task-cli.sh:*), Bash(.claude/skills/dates/scripts/date_context.sh:*), Bash(.claude/skills/projects/scripts/*:*), Bash(.claude/skills/google/scripts/google-cli.sh:*)
---

# Action Review

Review pending actions, commitments, and owed items across meetings, projects, email, and the task database.

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

Run the standard task queries (see @.claude/skills/task-cli/SKILL.md for full reference):

```bash
tcli overdue
tcli today
tcli blocked
tcli checkins
tcli list --due tomorrow
tcli list --due this-week
tcli list --status pending | grep -v "Alice"  # Waiting on others
tcli get T-XXX  # Verify specific task status
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

**D. Check Calendar for Commitments**

```bash
# Recent and upcoming events — check for commitments made in meetings
.claude/skills/google/scripts/google-cli.sh calendar upcoming --days 14
.claude/skills/google/scripts/google-cli.sh calendar search "review" --days 14
```

For each relevant event:
1. Check if meeting actions are tracked as tasks
2. Note upcoming meetings that need preparation
3. Flag commitments from past meetings without corresponding tasks

**E. Check Email for Action Items**

**Gmail commands:** `gmail search` to find, `gmail get MESSAGE_ID` to read (NOT `message`)

```bash
# Primary inbox - recent emails that may contain actions
.claude/skills/google/scripts/google-cli.sh gmail search "category:primary in:inbox newer_than:7d"

# Emails from/to specific people related to open tasks
.claude/skills/google/scripts/google-cli.sh gmail search "from:stakeholder newer_than:14d"
```

For each relevant email found:
1. Check if there's already a task for the action item
2. Check if an email provides an update on an existing task (e.g., someone responded)
3. Note emails that suggest new action items
4. Note emails waiting for response >3 days

**F. Review personal routines.md**

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

## 📧 Email Action Items

### New Actions from Email
| From | Subject | Suggested Action | Related Task |
|------|---------|-----------------|--------------|
| John | Budget review | Create task: "Review Q1 budget" | (none) |
| Sarah | Timeline confirmed | Update T-1234: unblock | T-1234 |

### Waiting for Response (>3 days)
| To | Subject | Sent | Days Waiting |
|----|---------|------|-------------|
| James | Meeting agenda | 25 Jan | 5 days |

### Emails That Update Existing Tasks
| Email | Task | Suggested Update |
|-------|------|-----------------|
| Sarah confirmed timeline | T-1234 | Mark complete or unblock |

## ⚠️ Potential Conflicts/Gaps

- [Meeting actions without Task IDs - not synced to DB]
- [Tasks without project assignment]
- [Stale items >2 weeks old without activity]
- [Emails with action items not tracked as tasks]
- [Tasks waiting on email response with no follow-up]

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

### 6. Update Project READMEs

For each project with activity (tasks, meetings, or emails), check the README:

```bash
# Check email activity for each active project
.claude/skills/google/scripts/google-cli.sh gmail search "subject:project-name newer_than:14d"
```

Update Current Status with:
- Task progress (completed, blocked, new)
- Email context ("⏳ **Legal review** — awaiting response from Sarah, email sent 25 Jan")
- Meeting outcomes
- `**Last updated:** DD Month YYYY`

**PROPOSE README changes** and ask user to confirm before editing.

### 7. PROPOSE Changes, Then Confirm

After presenting the report, use `AskUserQuestion` to propose actions. **Never make changes without asking.**

**Propose from email findings:**
- Create new tasks for email action items
- Update existing tasks based on email responses
- Flag emails needing follow-up

**Propose from task/meeting findings:**
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
11. Update project READMEs with current status

**Present all proposed changes together**, grouped by type, using `AskUserQuestion` with `multiSelect: true` so user can pick which to apply.

### 8. Update Working Memory

After completing the review, update `.claude/context/working-memory.md` with:
- Items still waiting on others (with dates)
- Patterns discovered (chronic deferrals, stale projects)
- Follow-ups needed

**Format:**
```
[YYYY-MM-DD] [Action Review] {key finding or follow-up needed}
```
