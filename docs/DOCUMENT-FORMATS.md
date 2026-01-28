# Document Format Specification

## Extractable Data (for AI reference)

The web app automatically extracts and displays structured data from markdown files. Use these patterns for automatic recognition:

| Pattern | Extracted As | Display Location |
|---------|--------------|------------------|
| `- 🟢 **Text**` | Status item (in-progress) | Project cards, detail page |
| `- 🟡 **Text**` | Status item (needs attention) | Project cards, detail page |
| `- 🔴 **Text**` | Status item (blocked) | Project cards, detail page |
| `- ✅ **Text**` | Status item (done) | Project cards, detail page |
| `- ⏳ **Text**` | Status item (waiting) | Project cards, detail page |
| `- [ ] Task` | Todo (pending) | Progress bar |
| `- [x] Task` | Todo (complete) | Progress bar |
| `### Phase N: Name (Now)` | Current phase | Project cards |
| `**Last updated:** Date` | Last updated | Project cards |
| `## Links` table | External links | Project detail page |

**Status items example:**
```markdown
- 🟢 **Digital grid app** — actively building, going well
- 🟡 **Deadline rules** — need to document lead times
- 🔴 **Legal review** — waiting on lawyer response
- ✅ **Initial setup** — completed last week
```

**Note**: The `<!-- AI_STATUS_START/END -->` format is deprecated. Use status emoji items instead — they display better on project cards and are editable via the structured project editor.

---

## Context: Knowledge Work Web

**Knowledge Work Web** is a Next.js web application being built to replace Obsidian as the primary interface for the KnowledgeWork knowledge base. It provides:

- **Dashboard**: At-a-glance view of today's diary, tasks, upcoming meetings, and project status
- **Semantic browsing**: Navigate by content type (projects, meetings, diary) rather than raw file tree
- **Task management**: Unified task database with meeting action sync and routine tracking
- **WYSIWYG editing**: Better markdown editing with structured forms for meetings and diary entries
- **Claude Code integration**: Chat panel and autonomous agent mode, with the web UI acting as an alternative frontend to a running Claude Code session
- **External integrations**: Airtable, Google Calendar - unified in one interface

For the web app to parse and display documents reliably, **all documents must follow consistent formats**. This specification defines those formats.

### Task System Architecture

The task system is central to how work items flow through the knowledge base:

```
Meeting Actions  →  Task Database (SQLite)
       ↓                    ↓
   (sync)            Web UI / API
       ↓                    ↓
Task Service         Diary Logging
 (port 3004)      (## Task Activity)
```

**Key concepts:**
- **Task Database** is the source of truth for all actionable work items
- **Meeting actions** sync to tasks via web UI or API
- **Task completion** logs to diary's `## Task Activity` section
- **Routines** are virtual — templates generate instances daily
- **Task IDs** are formatted as `T-{id}` (e.g., `T-42`)

### ⚠️ Filesystem-Database Sync (CRITICAL)

The knowledge base has two sources of data that must stay in sync:
1. **Filesystem** — markdown files, folder structure
2. **Database** — organizations, projects, people, tasks

**Sync Requirements:**

| When you create... | You MUST also... |
|--------------------|------------------|
| New organization folder | `tcli orgs-create <slug> "Name"` — orgs are NOT auto-created |
| New project folder | `tcli projects-create <slug> <name> --org <org>` — projects must exist in DB for task assignment |
| New person reference | `tcli people-create <name> --org <org>` — for task assignment and meeting attendees |
| Meeting with actions | `tcli sync meeting <path>` — creates tasks in DB |
| Workstream folder | `tcli sync file <path>` — links workstream to DB |

**Why this matters:**
- Tasks cannot be assigned to projects/orgs that don't exist in DB
- Meetings won't appear on People pages without sync
- Project pages won't show related tasks without DB entries
- Workstream status tracking requires DB records

**Always create in order:** Organization → Project → People → Tasks/Meetings

### What This Means for You (KnowledgeWork Agent)

1. **New documents** you create must follow these formats exactly
2. **Existing documents** should be migrated to these formats over time (not all at once - do it as you touch files)
3. **Frontmatter is now required** for meeting notes (you're already doing this well)
4. **Section headings must be consistent** - the web app will parse by heading name

---

## Document Types

### 1. Diary Entry

**Location**: `diary/YYYY/MM/DD-DOW.md`

| Component | Format | Example |
|-----------|--------|---------|
| Year | 4-digit | 2026 |
| Month | 2-digit, zero-padded | 01 |
| Day | 2-digit, zero-padded | 13 |
| Day of week | 3-letter | Mon, Tue, Wed, Thu, Fri, Sat, Sun |

**Example path**: `diary/2026/01/13-Tue.md`

#### Frontmatter (Optional)

```yaml
---
date: 2026-01-13
tags:
  - productive
  - meetings
---
```

Only add frontmatter if you want to add tags. The date can be inferred from the filename.

#### Required Structure

```markdown
# DD Month YYYY (Day)

## Summary

One paragraph summarising the day's focus, key achievements, and notable events.
End with timecard split: "Timecard: X.X YA + X.X ExOrg = X.X days."

---

## Work Log

*Timestamped entries as work progresses*

- HH:MM: Activity description
- Activity without timestamp

---

## Tasks for Today

*Prioritised task list at start of day*

### 🔴 Priority
- Critical tasks that must be done today

### 🟠 High
- Important tasks

### 🟡 Standard
- Normal priority

### Overdue / Needs Decision
- Tasks overdue or requiring decisions

### Personal
- Non-work tasks (optional section)

---

## Tasks Completed

- ✅ Completed task description
- 📝 Task done but needs follow-up (note what)
- ⚠️ Partial completion or blocker discovered

---

## Meetings

- [[path/to/meeting-note|Meeting Title]] — brief summary and key outcomes

---

## Reflections

End-of-day observations: patterns, concerns, wins, things to remember.

---

## Task Activity

<!-- AUTO-GENERATED: Task status changes from the task system -->
<!-- The AI reads this section to stay aware of task progress -->
- HH:MM — Completed T-42: "Task title" (Project Name)
- HH:MM — Started T-55: "Another task"
- HH:MM — Routine: "Daily routine name"
```

**Note about Task Activity**: This section is automatically populated by the task system when:
- Tasks are marked complete via web UI or API
- Routines are completed
- Task status changes (started, blocked, etc.)

The AI agent reads this section to understand what work was done during the day without needing to query the task database.

#### Section Heading Requirements

The web app will look for these **exact headings** (case-sensitive):
- `## Summary`
- `## Work Log`
- `## Tasks for Today`
- `## Tasks Completed`
- `## Meetings`
- `## Reflections`
- `## Task Activity` (auto-generated by task system)

#### Priority Subsection Headings

Under `## Tasks for Today`, use these exact headings:
- `### 🔴 Priority`
- `### 🟠 High`
- `### 🟡 Standard`
- `### Overdue / Needs Decision`
- `### Personal`

Not all subsections are required - only include those with content.

---

### 2. Meeting Note

**Location**: `{org}/meetings/YYYY/MM/YYYY-MM-DD-slug.md`

| Component | Format | Example |
|-----------|--------|---------|
| Org | Organisation folder | acme-corp, example-org, consulting |
| Year | 4-digit | 2026 |
| Month | 2-digit, zero-padded | 01 |
| Date prefix | YYYY-MM-DD | 2026-01-13 |
| Slug | kebab-case identifier | james-pdr-kickoff |

**Example path**: `acme-corp/meetings/2026/01/2026-01-13-james-pdr-kickoff.md`

#### Frontmatter (Required)

```yaml
---
title: Meeting Title
date: 2026-01-13
attendees:
  - Alice Smith
  - Other Person
location: Office
tags:
  - topic-tag
project: project-slug           # Single project (simple meetings)
# OR for multi-project meetings:
projects:                       # Multiple projects
  - grid-management
  - map
  - nuclear
status: completed
---
```

**YAML Quoting Rule**: If any value contains a colon (`:`), it must be quoted to avoid YAML parsing errors:
```yaml
# WRONG - colon breaks parsing:
title: Catch up re: PDR with James

# CORRECT:
title: "Catch up re: PDR with James"
```

| Field | Required | Values |
|-------|----------|--------|
| `title` | Yes | Human-readable meeting title (quote if contains `:`) |
| `date` | Yes | ISO date (YYYY-MM-DD) |
| `attendees` | Yes | Array of names |
| `location` | No | Office, Online, or venue name |
| `tags` | No | Array of topic tags |
| `project` | **Recommended** | Single project slug (use for simple meetings) |
| `projects` | **Recommended** | Array of project slugs (use for multi-topic meetings) |
| `status` | Yes | `completed`, `ongoing`, or `cancelled` |

#### Actions Table Format

Actions use task IDs as the source of truth. The excerpt preserves the original action text as it was extracted from the meeting.

**Before sync** (when first formatting a meeting):
```markdown
## Actions

| Owner | Action |
|-------|--------|
| Alice | Schedule 6-month check-in on policy development goal |
| James | Come back with improved goals for finalisation |
```

**After sync** (task IDs added, "Action" becomes "Excerpt"):
```markdown
## Actions

| Owner | Excerpt | Task |
|-------|---------|------|
| Alice | Schedule 6-month check-in on policy development goal | T-1234 |
| James | Come back with improved goals for finalisation | T-1235 |
```

**Key rules:**
- **Task** column contains the authoritative task ID (source of truth for status, due date, current title)
- **Excerpt** column preserves the original action text from the meeting — it does NOT change even if the task is renamed
- Status and due date live in the task database, not the markdown
- The web app displays live task status by looking up the ID
- For multi-project meetings, add a `Project` column: `| Owner | Excerpt | Project | Task |`

**Why "Excerpt"?**
Meeting notes are historical records. The excerpt preserves what was originally discussed, while the Task ID links to the living, editable task. If you rename or refine a task later, the meeting note still reflects the original discussion context.

**Single vs Multi-Project Meetings:**
- Use `project: slug` for meetings focused on one project
- Use `projects: [slug1, slug2]` when a meeting covers multiple projects
- If both are present, `projects` takes precedence
- The first project in `projects` array is the "primary" project (used as default for actions)

**Subproject References:**
- Subprojects (like `nuclear` under `energy`) can be referenced by their slug alone
- The system automatically resolves the full path (e.g., `nuclear` → `energy/nuclear`)
- You can also use the full path explicitly: `project: energy/nuclear`
- Both formats work, but simple slugs are recommended for brevity

**Bidirectional Project Linking**: When you set project(s):
- The meeting appears in each project's "Related Meetings" section on the web app
- From any project page, you can see all meetings linked to that project
- Always use the project's slug (folder name), not the display name

#### Required Structure

```markdown
---
[frontmatter]
---

# Meeting Title

## Summary

2-4 sentences: what was discussed, key outcomes, decisions made.

---

## Discussion

### Topic Heading

- **Key point** — elaboration
- Discussion detail
  - Sub-point

### Another Topic

Organised by discussion topics, not chronologically.

---

## Decisions

- Decision 1 with brief context
- Decision 2 with brief context

---

## Actions

| Owner | Excerpt | Task |
|-------|---------|------|
| Name | Action description from meeting | T-1234 |
| Name | Another action | T-1235 |

---

## Related

- [[path/to/related-file|Display Text]]
```

#### Section Heading Requirements

Required (web app expects these):
- `## Summary`
- `## Actions`

Optional but recommended:
- `## Discussion`
- `## Decisions`
- `## Related`
- `## Actions from Previous Meetings`

#### Actions Table Parsing

The web app parses the Actions table to extract tasks. See the "Actions Table Format" section above for the definitive format.

**Column definitions:**
- **Owner**: Person responsible (first name is fine)
- **Excerpt**: Original action text from the meeting (frozen snapshot)
- **Task**: Task ID linking to the database (e.g., `T-1234`)
- **Project**: (Optional) Project slug when actions span multiple projects

**Project column behaviour:**
- If the Project column is omitted, all actions inherit the meeting's primary project
- If the Project column is empty for a row, that action inherits the meeting's primary project
- Use the Project column when different actions relate to different projects within the same meeting

#### Action Status Values (Task Database)

These statuses are managed in the task database, not in the meeting markdown. When you view tasks via the web UI or API, they use these statuses:

| Status | Category | When to Use |
|--------|----------|-------------|
| `Pending` | Active | Not started yet (default for new actions) |
| `In Progress` | Active | Currently being worked on |
| `Blocked` | Blocked | Waiting on a blocker to be resolved (specify blocker in action text) |
| `Waiting` | Blocked | Waiting on someone else — external dependency |
| `Complete` | Done | Action fully completed |
| `Done` | Done | Alias for Complete (either is valid) |
| `Delegated` | Done | Handed off to someone else to track — no longer this person's responsibility |
| `Cancelled` | Inactive | No longer needed |
| `N/A` | Inactive | Not applicable — tracked elsewhere or doesn't apply |

**Category behaviour in web app:**
- **Active** (Pending, In Progress): Expanded by default, sorted to top
- **Blocked** (Blocked, Waiting): Expanded by default, highlighted in red
- **Done** (Complete, Done, Delegated): Collapsed by default, dimmed
- **Inactive** (Cancelled, N/A): Collapsed by default, dimmed

**Assignee grouping**: When viewing actions grouped by assignee, people with only Done/Inactive actions are collapsed by default and sorted to the bottom

#### Meeting → Task Sync

After formatting a meeting with actions, sync them to the task database:

1. **Via Web UI**: Click "Sync Tasks" button on the meeting page
2. **Via CLI**: `.claude/skills/task-cli/scripts/task-cli.sh sync meeting <path>`

**What happens:**
- Creates tasks in task DB for each action
- Returns task IDs to add to the meeting markdown
- Links tasks to the meeting as `source_meeting_id`
- Assigns owner based on action Owner column

**After sync, update your markdown:**
1. Add a `Task` column with the returned IDs
2. Rename "Action" column to "Excerpt" (signals this text is frozen)
3. The task database becomes the source of truth for status and due dates

---

### 3. Project README

**Location**: `{project}/README.md` or `{org}/projects/{project}/README.md`

**Example paths**:
- `acme-corp/projects/inventory-system/README.md`
- `example-org/projects/scout/README.md`

#### Frontmatter (Optional but Recommended)

```yaml
---
title: Project Name
status: active
priority: 1
org: acme-corp
tags:
  - housing
  - usa
---
```

| Field | Values |
|-------|--------|
| `status` | `active`, `planning`, `maintenance`, `completed`, `paused` |
| `priority` | 1 (highest) to 5 (lowest) |
| `org` | `acme-corp`, `example-org`, `consulting`, `personal` |

#### Keeping Project READMEs Current

**Project READMEs should be updated frequently** — not just during end-of-day reviews. Update them:

- When you complete work on a project
- When you learn something new from emails or meetings
- When status changes (blocked, waiting, progressing)
- When working on or asked about a project

**Include email context**: The Current Status section should reflect what's happening in email correspondence. For example:
- "🟢 **Budget approval** — John confirmed via email (28 Jan)"
- "⏳ **Legal review** — awaiting response from Sarah (email sent 25 Jan)"
- "🟡 **Timeline discussion** — James raised concerns in email, need to address"

**When working on a project**, always:
1. Check gmail for recent correspondence about the project
2. Update the README with any new information
3. Note who you're waiting on and when you last contacted them

#### Recommended Structure

```markdown
# Project Name

**Priority**: #N project for [Organisation]

## Overview

What the project is, why it matters, what success looks like.

---

## Current Status

**Last updated:** DD Month YYYY

### Phase N: Phase Name (Now)
- ✅ **Completed item** — what was done
- 🟢 **In progress item** — current status, going well
- 🟡 **Needs attention** — what needs work, why
- 🔴 **Blocked** — what's blocking, who to talk to

### Phase N+1: Next Phase (Target)
- [ ] Upcoming task
- [ ] Another task

---

## [Project-Specific Sections]

Add sections relevant to the project:
- Background
- How It Works
- Key Relationships
- Technical Details
- Research Needs

---

## Implementation / Next Steps

- [x] Completed task
- [ ] Pending task — context/status
- [ ] Another task

For detailed tracking, see `next-steps.md`.

---

## Links

| Resource | Link |
|----------|------|
| Stakeholder CRM | Airtable base link |
| Code Repository | GitHub link |
| Street Votes Tracking Sheet | Google Sheets link |
| Live Nuclear Tracker | Website link |
```

**Link titles should be descriptive** — you should be able to understand what you'll find at a glance. Use specific names like "Stakeholder CRM" or "Contact Tracking Sheet", not generic labels like "Airtable" or "Google Sheets".

**Web App Integration**: The Links table is parsed and displayed as clickable pills at the top of project pages. Icons are auto-assigned based on URL:
- `github.com` → GitHub icon
- `figma.com` → Figma icon
- `notion.so` → Docs icon
- `docs.google.com/spreadsheets` → Spreadsheet icon
- `docs.*` or `*/docs` → Docs icon
- Other URLs → Globe icon

---

## AI Status Summary (DEPRECATED)

> **Deprecated**: The `<!-- AI_STATUS_START/END -->` format is deprecated. Use status emoji items instead (see "Extractable Data" section at the top).

AI assistants previously maintained a structured status summary inside HTML comments. This format is being phased out in favor of status emoji items, which:
- Display properly on project cards (the HTML comment format had display bugs)
- Can be edited via the structured project editor
- Are more readable in raw markdown

**Migration**: Convert AI_STATUS blocks to status emoji items:

```markdown
<!-- Old format (deprecated) -->
<!-- AI_STATUS_START -->
**Status Summary** (15 January 2026)
**Recent**: Deployed live tracker. Good feedback.
**Current**: Phase 2 content expansion underway.
**Blocked/Waiting**: Awaiting Oklo announcement date.
**Next**: Complete plutonium integration.
<!-- AI_STATUS_END -->

<!-- New format (preferred) -->
## Current Status

**Last updated:** 15 January 2026

- 🟢 **Phase 2 content expansion** — underway, going well
- ⏳ **Oklo tracking** — awaiting announcement date from Ed
- ✅ **Live tracker deployed** — good feedback received

#### Task System Integration

Project READMEs can include a Tasks section that links to the task database. The web app parses this and displays live task status.

**Format:**
```markdown
## Tasks

<!-- TASKS:project=project-slug -->
| Item | Task |
|------|------|
| Task description | T-1083 |
| Another task | T-1084 |
<!-- /TASKS -->
```

**Key points:**
- The `<!-- TASKS:project=X -->` comment tells the web app which project to query
- The table maps human-readable item names to task IDs (`T-{id}` format)
- The web app shows live status for each task from the task database
- Status is tracked in the task database, not in the README

**When to use:**
- Add this section after migrating project tasks to the task database
- Use the CLI to find task IDs: `.claude/skills/task-cli/scripts/task-cli.sh list --project your-project`

#### Web App Extraction

The web app extracts structured data from project READMEs for dashboard display:

| Extracted Field | How to Include |
|-----------------|----------------|
| Current phase | Use heading format: `### Phase N: Name (Now)` |
| Last updated | Use: `**Last updated:** DD Month YYYY` |
| Status items | Use emoji bullets: `- ✅`, `- 🟢`, `- 🟡`, `- 🔴` |
| Todos | Use markdown checklists: `- [ ]` and `- [x]` |
| Tasks | Use `<!-- TASKS:project=X -->` section with task ID table |

**Status emoji meanings:**
- `✅` — Completed/Done
- `🟢` — In progress, going well
- `🟡` — Needs attention/Pending
- `🔴` — Blocked
- `⏳` — Waiting on something

**Example status items (parsed by web app):**
```markdown
- ✅ **Initial team buy-in** — achieved Mon 13 Jan
- 🟢 **Digital grid app** — actively building, going well
- 🟡 **Deadline rules** — need to document lead times
- 🔴 **Legal review** — waiting on lawyer response
```

#### Section Heading Requirements

Required:
- `## Overview` (or similar: "What is this", "About")

Recommended:
- `## Current Status`
- `## Next Steps` or `## Implementation`

---

### 4. Project Next Steps

**Location**: `{project}/next-steps.md`

This file is **for you (the agent)** to resume context quickly. Keep it updated as you work on a project.

**Example path**: `acme-corp/projects/inventory-system/next-steps.md`

#### Required Structure

```markdown
# Project Name: Next Steps

**Last updated:** DD Month YYYY

---

## Current Status (DD Month YYYY)

Brief description of where things stand:
- What just happened
- Key outcomes from recent work
- Decisions made

### Blockers

- ⏳ What we're waiting on (who/what)
- ⏳ Another blocker

---

## Completed

### ✅ Task/Milestone Name
What was done. Reference output files if relevant.

---

## In Progress

- [ ] Task being worked on — current status
- [ ] Another task

---

## Questions / Needs Decision

1. **Question** — context and options
2. **Another question**

---

## Next Actions

### Immediate (This Week)
- [ ] Specific task
- [ ] Another task

### Soon (Next 2 Weeks)
- [ ] Future task

### Later
- [ ] Backlog item
```

#### Key Requirements

1. **Always update `Last updated`** when you modify this file
2. **Keep Blockers section current** - remove resolved blockers
3. **Move completed items** from In Progress to Completed
4. **Be specific** about what's next - these should be actionable

---

### 5. Org README

**Location**: `{org}/README.md`

**Example paths**:
- `acme-corp/README.md`
- `example-org/README.md`

#### Structure

```markdown
# Organisation Name

Brief description and your role.

---

## Projects

| Project | Status | Description |
|---------|--------|-------------|
| [[projects/project-name/README\|Project Name]] | 🟢 | Brief description |
| [[projects/another/README\|Another]] | 🟡 | Brief description |

### Status Key
- 🟢 Active, on track
- 🟡 Needs attention
- 🔴 Blocked
- 🔵 Planning/New
- ✅ Complete
- ⏸️ Paused

---

## People

Key people and roles (brief).

---

## Processes

Meeting cadences, workflows, etc.
```

---

### 6. Workstream

**Location**: `{org}/projects/{parent-project}/{workstream}/README.md`

Workstreams are components or focus areas within a larger parent project. They are **folders** inside a project folder, mirroring the project structure with their own `README.md`, optional `context/` folder, and other supporting files.

**Example structure**:
```
example-org/projects/energy/
├── README.md                    # Parent project
├── context/                     # Parent project context
├── analytics/
│   ├── README.md                # Nuclear workstream
│   ├── context/                 # Workstream-specific context
│   └── next-steps.md            # Optional
└── grid-tracker/
    ├── README.md                # Grid tracker workstream
    └── analysis.md              # Workstream-specific docs
```

**Example paths**:
- `acme-corp/projects/ya-management/employment-transition/README.md`
- `example-org/projects/energy/analytics/README.md`

#### Frontmatter (Required)

```yaml
---
type: workstream
title: Workstream Name
status: active
parent: energy
priority: 2
---
```

| Field | Required | Values |
|-------|----------|--------|
| `type` | **Yes** | Must be `workstream` — this is how the web app identifies workstreams |
| `title` | Yes | Human-readable name |
| `status` | Yes | `active`, `planning`, `maintenance`, `completed`, `paused` |
| `parent` | No | Parent project slug (inferred from folder if not specified) |
| `priority` | No | 1 (highest) to 5 (lowest) |

**Important**: Without `type: workstream` in the README.md frontmatter, the folder will be treated as a regular subfolder, not a workstream.

#### Standard Workstream Files

| File | Purpose | Required |
|------|---------|----------|
| `README.md` | Workstream overview, status, key decisions | **Yes** |
| `next-steps.md` | Resumption context for assistant | No |
| `context/` | Reference materials, PDFs, background docs | No |

#### Structure

Workstream READMEs follow the same structure as Project READMEs:

```markdown
---
type: workstream
title: Workstream Name
status: active
parent: energy
priority: 2
---

# Workstream Name

## Overview

What this workstream covers and why it exists separately.

---

## Current Status

**Last updated:** DD Month YYYY

- ✅ **Completed item** — what was done
- 🟢 **In progress** — current work
- 🟡 **Needs attention** — issues to resolve
- 🔴 **Blocked** — blockers

---

## Next Steps

- [ ] Pending task
- [ ] Another task
```

#### Parent Project: Workstreams Table

Parent projects should list their workstreams in a table format. The web app parses this to show workstream status on the parent page.

**Format:**

```markdown
## Workstreams

| Status | Workstream | Description |
|--------|------------|-------------|
| 🟢 | [[employment-transition/README\|Employment Transition]] | Transition planning for contractor to employee |
| 🟡 | [[analytics/README\|Nuclear]] | Nuclear policy work and stakeholder engagement |
| ⏳ | [[grid-tracker/README\|Grid Tracker]] | Grid management implementation tracker |
```

**Table columns:**
- **Status**: Emoji indicating state (see emoji reference below)
- **Workstream**: Wikilink to the workstream README
- **Description**: Brief description

**Valid status emojis:**
- `🟢` — Active, on track
- `🟡` — Needs attention
- `🔴` — Blocked
- `⏳` — Waiting/Pending
- `✅` — Complete

#### Web App Display

The web app:
1. **Detects workstreams** by scanning for subdirectories inside project folders that contain a `README.md` with `type: workstream` frontmatter
2. **Parses the Workstreams table** from parent README to get status and descriptions
3. **Shows workstreams** nested under their parent on the projects list page
4. **On parent project page**: Shows workstream cards with status items and progress
5. **On workstream page**: Shows files, meetings, nested workstreams (if any)
6. **Routes**: Workstreams are accessible at `/projects/{org}/{parent}/{workstream}`

**Note**: Subdirectories without `type: workstream` in their README (e.g., `context/` folders) are not treated as workstreams.

#### File System Sync

Workstreams can be synced bidirectionally with the task database:

```bash
# Sync all workstream files to database
tcli sync filesystem

# Preview workstream files found in filesystem
tcli sync filesystem-preview

# Sync a specific workstream file to database
tcli sync file example-org/projects/energy/analytics/README.md

# Push database changes back to a workstream file
tcli sync item T-42
```

**Sync behaviour:**
- File changes update the corresponding `Item` record with `itemType='workstream'`
- `filePath` and `fileHash` are tracked for conflict detection
- If both file and database changed since last sync, a conflict is flagged
- Frontmatter fields (`status`, `priority`, `title`) are kept in sync

#### Migration from File-Based Workstreams

If you have legacy file-based workstreams (`workstream.md` instead of `workstream/README.md`):

1. Create the workstream folder: `mkdir {parent}/{workstream}`
2. Move the file: `mv {parent}/{workstream}.md {parent}/{workstream}/README.md`
3. Update wikilinks in parent README: `[[workstream|Name]]` → `[[workstream/README|Name]]`

---

## Emoji Reference

### Priority (for Tasks for Today)

| Emoji | Level | Use When |
|-------|-------|----------|
| 🔴 | Critical | Must complete today, blocking other work |
| 🟠 | High | Important, should complete today |
| 🟡 | Standard | Normal priority |
| ⚪ | Low | Can defer if needed |

### Completion Status (for Tasks Completed)

| Emoji | Status | Use When |
|-------|--------|----------|
| ✅ | Complete | Task fully done |
| 📝 | Done with note | Task done but context needed for diary/tracking |
| ⚠️ | Blocked/Partial | Hit a blocker or only partially complete |
| ❌ | Cancelled | Task no longer needed |

### Project Status (for Org READMEs)

| Emoji | Status |
|-------|--------|
| 🟢 | Active, on track |
| 🟡 | Active, needs attention |
| 🔴 | Blocked |
| 🔵 | Planning/New |
| ✅ | Complete |
| ⏸️ | Paused |

### Blockers (for Next Steps)

| Emoji | Meaning |
|-------|---------|
| ⏳ | Waiting on something/someone |

### Action Status (for Meeting Actions)

| Status | Category | Colour in Web App |
|--------|----------|-------------------|
| Pending | Active | Amber |
| In Progress | Active | Blue |
| Blocked | Blocked | Red |
| Waiting | Blocked | Purple |
| Complete / Done | Done | Green (dimmed) |
| Delegated | Done | Cyan (dimmed) |
| Cancelled | Inactive | Grey (dimmed) |
| N/A | Inactive | Grey (dimmed) |

---

## Migration Notes

When you encounter existing documents that don't follow these formats:

1. **Don't batch-migrate** - update files as you naturally touch them
2. **Prioritise meeting notes** - frontmatter is most important for parsing
3. **Diary entries** - most are already compliant, just ensure section headings match
4. **Project files** - add frontmatter when you next update them

### Common Fixes Needed

- Add missing frontmatter to meeting notes (especially `status` field)
- Standardise section headings (e.g., "Summary" not "Overview" for meetings)
- Ensure Actions tables have correct column order
- Update `Last updated` dates in next-steps files
