---
name: meetings
description: Manage meeting notes - prep agendas, format records, extract actions, scan for lost items. Use when user mentions meetings, agendas, meeting prep, or action tracking.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Meeting Management

## Frontmatter Format

All meeting notes use YAML frontmatter:

```yaml
---
title: Meeting Title
date: YYYY-MM-DD
time: HH:MM
attendees:
  - Name One
  - Name Two
location: online | office | venue name
tags:
  - topic1
  - topic2
project: project-folder-name          # Single project (simple meetings)
# OR for multi-project meetings:
projects:                             # Multiple projects
  - grid-management
  - map
  - analytics-dashboard
status: completed | ongoing | cancelled
---
```

**Required**: title, date, attendees, status
**Optional**: time, location, tags, project/projects

**CRITICAL — Quote Values with Special Characters:**
YAML interprets colons (`:`) as key-value separators. If a title or other value contains a colon, **it must be quoted**:
```yaml
# WRONG - will break parsing:
title: Catch up re: PDR with James

# CORRECT - quoted:
title: "Catch up re: PDR with James"
```

Other characters requiring quotes: `#`, `[`, `]`, `{`, `}`, `>`, `|`, `*`, `&`, `!`, `%`, `@`, `` ` ``

**CRITICAL — Project References Must Match Existing Folders:**
- Project slugs MUST match actual folder names in the project structure
- Use the folder name, NOT a display name or abbreviation
- **Always discover valid slugs dynamically** — never hardcode or assume
- Example: use `ya-management` not `management`, use `inventory-system` not `sv-usa`

**Discovering Valid Project Slugs:**
```bash
# List all valid slugs
.claude/skills/projects/scripts/valid_slugs.sh

# Check if a specific slug is valid
.claude/skills/projects/scripts/valid_slugs.sh --check nuclear

# Filter by org
.claude/skills/projects/scripts/valid_slugs.sh --org example-org
```

See `.claude/skills/projects/SKILL.md` for full options.

**Single vs Multi-Project Meetings:**
- Use `project: slug` for meetings focused on one project
- Use `projects: [slug1, slug2]` when a meeting covers multiple topics/projects (e.g., 1-1s, check-ins)
- If both are present, `projects` takes precedence
- The first project in `projects` is the "primary" (default for actions without explicit project)

**Note**: See `content/DOCUMENT-FORMATS.md` for the authoritative format spec used by the web app.

## File Naming & Location

- Format: `YYYY-MM-DD-slug.md`
- Location: `{project}/meetings/YYYY/MM/` (grouped by month)
- Example: `acme-corp/meetings/2026/01/2026-01-08-ya-start-of-year-strategy.md`

## Diary Integration

**After creating or formatting a meeting**, ensure it's linked from the diary entry for that date:

1. Check diary file exists: `diary/YYYY/MM/DD-DOW.md`
2. Add to `## Meetings` section with context:
   ```markdown
   - [[project/meetings/YYYY/MM/YYYY-MM-DD-slug|Title]] — brief outcome
   ```
3. If diary doesn't exist, create it or note for user

This ensures meetings are discoverable both by project (folder) and by date (diary).

## Operations

### 1. Prep Meeting (Create Agenda)

When user asks to prep a meeting:

```markdown
---
title: [Title]
date: [Date]
time: [Time if known]
attendees:
  - [Names]
location: [online/office/etc]
tags: []
project: [project]
status: scheduled
---

# [Title]

## Agenda

1. [Item 1]
2. [Item 2]
3. AOB

## Pre-meeting Notes

[Context, things to raise, questions to ask]

## Actions from Previous Meetings

[Check for pending actions with these attendees - use scan operation]
```

**After creating the agenda file, sync it:**
```bash
.claude/skills/task-cli/scripts/task-cli.sh sync meeting path/to/meeting.md
```

### 2. Format Meeting Record

After a meeting, convert raw notes to structured format.

**CRITICAL: Preserve all information.** When formatting:
- Tidy and organise into sections
- Convert fragments to full sentences where helpful
- Extract actions into the actions table
- Add context (attendee roles, related projects)
- Fix typos and clarify abbreviations

**But NEVER:**
- Summarise away specific examples, quotes, or numbers
- Replace the user's captured examples with your own
- Lose details like exact figures, specific names, or verbatim advice
- Over-generalise specific guidance into vague principles

The user's raw notes are the source of truth. The formatted version should be *more readable*, not *less detailed*.

```markdown
---
[frontmatter]
status: completed
---

# [Title]

## Summary

[2-3 sentence summary of key outcomes]

## Discussion

### [Topic 1]
- Point
- Point

### [Topic 2]
- Point

## Decisions

- [Decision 1]
- [Decision 2]

## Actions

| Owner | Action |
|-------|--------|
| Name | Task description |
| Other | Another task |

## Related

- [[path/to/related-file|Display Text]]
```

**IMPORTANT: Actions Table Workflow**

1. **When first formatting**: Use simple 2-column format (Owner, Action)
2. **After syncing to task DB**: Add Task column with IDs, rename "Action" to "Excerpt"
3. **For multi-project meetings**: Add Project column before Task column

**Before sync:**
```markdown
| Owner | Action |
|-------|--------|
| Alice | Schedule 6-month check-in |
| James | Finalise goals document |
```

**After sync (Task IDs added, "Action" becomes "Excerpt"):**
```markdown
| Owner | Excerpt | Task |
|-------|---------|------|
| Alice | Schedule 6-month check-in | T-1234 |
| James | Finalise goals document | T-1235 |
```

**Multi-project meetings (after sync):**
```markdown
| Owner | Excerpt | Project | Task |
|-------|---------|---------|------|
| Alice | Chat to Ed about map | map | T-1236 |
| Alice | Update grid tracker | grid-management | T-1237 |
```

**Key rules:**
- The `Task` column (task ID) is the **source of truth** for status and due date
- The `Excerpt` column is a frozen snapshot of the original action text — do NOT update it
- To change a task's title/status/due, edit it in the task DB, not the markdown
- The web app looks up task IDs to show live status
- "Excerpt" signals to readers that this text is historical context, not the current task title

**After formatting, always sync the meeting:**
```bash
.claude/skills/task-cli/scripts/task-cli.sh sync meeting path/to/meeting.md
```
Then update the markdown with the returned task IDs.

### 3. Extract Actions

Parse meeting notes and:
1. Identify all actions (look for "ACTION:", "OWED:", task assignments, commitments)
2. Format into actions table
3. Note actions owed BY others (for tracking)
4. **Set up blocking relationships** in the task system (not in action text)

**Shorthand notation in raw notes:**
- `ACTION:` — Task for Alice or the team to do
- `OWED:` — Something someone else needs to send/provide to Alice/team (e.g., "OWED: Kane to send report")

When formatting, convert `OWED:` items into the Actions table with the other person as Owner.

**Handling Blocking Relationships:**

When raw notes mention "blocked by" or "blocks" relationships:
1. **DO NOT** include "(blocked by X)" or "(blocks T-123)" in action text
2. **DO** create clean action titles
3. **After sync**, use `--blocked-by` to set up proper blocking:
   ```bash
   tcli update T-1221 --blocked-by T-1220   # T-1221 is blocked by T-1220
   ```
4. **Optionally** add a note below the Actions table documenting relationships:
   ```markdown
   **Blocking relationships:** T-1220 → T-1221, T-8 | T-1222 → T-1223
   ```

This keeps action titles clean while maintaining proper task dependencies in the system.

### 4. Scan for Lost Items

Search previous meetings for:
- Pending actions (Status: Pending)
- Actions without due dates
- Actions owed by specific person
- Unresolved items from meetings with specific attendees

```bash
# Find all meetings with pending actions
grep -r "Pending" */meetings/*/*.md

# Find meetings with specific attendee
grep -rl "John Myers" */meetings/*/*.md

# Find meetings from a specific month
ls acme-corp/meetings/2026/01/
```

### 5. Validate Project References

For bulk validation of project references in meetings, see **`.claude/skills/projects/SKILL.md`** → "Validating Project References" section.

Quick check for a single slug:
```bash
.claude/skills/projects/scripts/valid_slugs.sh --check analytics-dashboard
```

## Task Database Integration

**CRITICAL: After creating or formatting ANY meeting, you MUST sync it to the database.**

Syncing does two things:
1. **Links attendees** — meeting appears on each person's People page
2. **Creates tasks** — actions become trackable tasks with IDs

### Syncing Meetings (Required)

```bash
# Always sync after creating/formatting a meeting
.claude/skills/task-cli/scripts/task-cli.sh sync meeting path/to/meeting.md

# Example
.claude/skills/task-cli/scripts/task-cli.sh sync meeting example-org/meetings/2026/01/2026-01-19-grid-maps-brainstorm.md
```

**Why this matters:** Without syncing, meetings won't appear on attendees' People pages, and actions won't be tracked in the task system.

### After Syncing: Update the Markdown

If the meeting has actions, the sync command returns task IDs. Update the meeting file:

1. Add task IDs to a new "Task" column
2. Rename "Action" column to "Excerpt" (signals frozen historical text)

```markdown
## Actions

| Owner | Excerpt | Task |
|-------|---------|------|
| Alice | Schedule 6-month check-in | T-1234 |
| James | Finalise goals document | T-1235 |
```

The Excerpt column preserves the original action text from the meeting. Task IDs are now the source of truth — edit status/title/due in the task database, not the markdown.

### Query Tasks from a Meeting

```bash
.claude/skills/task-cli/scripts/task-cli.sh search "meeting-slug"
```

## Recognizing Multi-Project Meetings

**When to use multi-project format:**
- 1-1 check-ins that cover multiple workstreams (e.g., Julia check-in covering grid-management, map, analytics-dashboard)
- Strategy meetings spanning multiple initiatives
- Any meeting where distinct topics relate to different project folders

**Signs a meeting should use `projects:` array:**
- Discussion naturally groups into separate topics with different project contexts
- Actions would logically belong to different project pages
- The meeting title is generic (e.g., "Weekly Check-in") rather than project-specific

**How to format multi-project meetings:**

1. **Frontmatter**: List all relevant projects
   ```yaml
   projects:
     - grid-management
     - map
     - analytics-dashboard
   ```

2. **Discussion section**: Group by project using headers
   ```markdown
   ## Discussion

   ### Grid Management
   - Points about grid tracker...

   ### Map Project
   - Points about interactive map...

   ### Nuclear
   - Points about Oklo, plutonium paper...
   ```

3. **Actions table**: Add Project column (after sync, use Excerpt pattern)

   Before sync:
   ```markdown
   | Owner | Action | Project |
   |-------|--------|---------|
   | Alice | Chat to Ed about map | map |
   | Alice | Tasks for Esther | grid-management |
   ```

   After sync:
   ```markdown
   | Owner | Excerpt | Project | Task |
   |-------|---------|---------|------|
   | Alice | Chat to Ed about map | map | T-1236 |
   | Alice | Tasks for Esther | grid-management | T-1237 |
   ```

**Backwards compatibility:** Existing meetings with single `project:` field continue to work unchanged. The web app handles both formats.

## Tips

- **Always sync meetings after creating/formatting** — otherwise they won't appear on People pages
- Always check for pending actions with attendees before a meeting
- Status updates happen in the task database, not the meeting markdown
- The Excerpt column in meetings is frozen — never edit it after sync
- Link related meetings: `See also: [[path/to/meeting]]`
- Tag recurring meetings consistently (e.g., `standup`, `1-1`, `strategy`)
- Use `OWED:` in raw notes when someone needs to send something to you — this gets converted to an action with them as Owner
- For multi-topic 1-1s and check-ins, use the `projects:` array with Project column in actions table
