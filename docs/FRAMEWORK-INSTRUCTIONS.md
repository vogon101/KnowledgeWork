# Knowledge Agent Framework Instructions

Generic instructions for Knowledge Agents working with KnowledgeWork content repositories.

**This file is symlinked into content repos. User-specific instructions belong in the content repo's CLAUDE.md.**

---

## Session Startup

1. `.claude/context/working-memory.md` is auto-loaded — review it for context
2. Read `INDEX.md` - project status and priorities
3. Check task service (start from framework repo with `pnpm dev:server` if needed):
   - `.claude/skills/task-cli/scripts/task-cli.sh today` — tasks due today
   - `.claude/skills/task-cli/scripts/task-cli.sh checkins` — check-ins due
   - `.claude/skills/task-cli/scripts/task-cli.sh routines due` — today's routines
   - `.claude/skills/task-cli/scripts/task-cli.sh activity --limit 20` — recent activity
4. Check/create today's diary file (`diary/YYYY/MM/DD-DOW.md`)

---

## Context Loading Priority

When resuming work on a project, load context in this order:

1. **Project README.md** — overview, status, key decisions
2. **Project next-steps.md** — current state, blockers, next actions
3. **Task Database** — `tcli list --project <slug>` for active tasks
4. **Other files** — meeting notes, context docs as needed

---

## Key Files

| File | Purpose |
|------|---------|
| `INDEX.md` | Project status, priorities, quick links |
| `.claude/context/working-memory.md` | Private scratchpad (auto-loaded) |
| `.claude/context/background.md` | User background, roles, key people |
| `diary/YYYY/MM/DD-DOW.md` | Daily work log |
| `[project]/next-steps.md` | Context for resuming work on a project |
| `DOCUMENT-FORMATS.md` | Authoritative document format spec |

---

## File Conventions

### Directory Structure
- **Keep org roots clean** — READMEs, meeting folders, project folders only
- **Use `.claude/context/`** for research, prompts, scratchpad files
- **Use wikilinks** `[[file]]` for Obsidian compatibility

### Research Prompts
When user provides a research prompt or asks you to save something for later:
1. Save to `.claude/context/research-prompt-{topic}.md`
2. After completing the research, delete the prompt file
3. Put findings in the appropriate project folder or working-memory

### File Writing Scope
Only write files within the content directory. When the user mentions files in other repos (e.g., a coding project), that's for context only — other agents handle those.

---

## Ground Truth

Don't duplicate data from authoritative sources:
- **Task Database** → All actionable work items (source of truth)
- **Content repo** → Strategy, context, notes that *aren't* in the task system

---

## Integrations

### Task System (Primary)

The task database is the **sole source of truth** for all actionable work items.

**Service:** `http://localhost:3004` (start from framework repo with `pnpm dev:server`)
**Web UI:** `http://localhost:3000/tasks`
**CLI:** See @.claude/skills/task-cli/SKILL.md for full documentation

```bash
# Query tasks
.claude/skills/task-cli/scripts/task-cli.sh list --due today
.claude/skills/task-cli/scripts/task-cli.sh today
.claude/skills/task-cli/scripts/task-cli.sh overdue
.claude/skills/task-cli/scripts/task-cli.sh checkins
.claude/skills/task-cli/scripts/task-cli.sh activity

# Modify tasks
.claude/skills/task-cli/scripts/task-cli.sh complete T-42
.claude/skills/task-cli/scripts/task-cli.sh update T-42 --status blocked
.claude/skills/task-cli/scripts/task-cli.sh create task "Title" --priority 2
```

**Key concepts:**
- **Task IDs** are `T-1`, `T-42` etc
- **Status values**: pending, in_progress, complete, blocked, cancelled, deferred
- **Owner** = person responsible

### Meetings

Use the meetings skill for consistent meeting management.
See @.claude/skills/meetings/SKILL.md for full usage.

- **Location**: `{org}/meetings/YYYY/MM/YYYY-MM-DD-slug.md`
- **Required frontmatter**: title, date, attendees, status
- **After formatting a meeting**, sync actions via web UI or CLI

### Web UI Notifications

When you create content the user should review, notify them via the web UI:

```bash
.claude/skills/notify-web/scripts/notify-web.sh <type> "<title>" "<path>" ["message"]
```

**Types**: `document`, `workstream`, `project`, `meeting-notes`, `other`

**When to notify**:
- New documents (summaries, analyses, reports, briefs)
- New workstreams or projects
- Formatted meeting notes
- Any content requiring user review or approval

**Do NOT notify for**:
- Routine diary entries
- Working memory updates
- Minor file edits
- Internal context files

**Example**:
```bash
.claude/skills/notify-web/scripts/notify-web.sh document "Q4 Strategy Summary" "anthropic/documents/q4-strategy.md" "Ready for your review"
```

This sends a toast notification to the web UI with an "Open" button linking directly to the file.

---

## Conventions

### Task System Access
**ALWAYS use the task CLI** (`.claude/skills/task-cli/scripts/task-cli.sh`) for all task database operations.

### Dates
**ALWAYS use explicit dates** (e.g., "Saturday 11 Jan", "15 January") - never vague terms like "this weekend" or "next week".

**ALWAYS use the dates skill** — never calculate dates mentally:
```bash
.claude/skills/dates/scripts/date_context.sh
```

### Document Formats
See `DOCUMENT-FORMATS.md` for authoritative spec for:
- Diary entries
- Meeting notes
- Project READMEs
- Workstreams

### Output Format
- Obsidian-compatible Markdown (wikilinks where useful)
- Concise, fact-heavy

---

## Working Memory

`.claude/context/working-memory.md` — private scratchpad, auto-loaded every message.

**Use for**:
- Blockers, awaiting-input states, pending decisions
- User preferences and working patterns
- Planning notes and strategic thinking

**Keep concise**: Facts and observations, not prose. Trim entries >7 days unless still relevant.

---

## Project Organization

### The `_general` Project

Each organization has a special `_general` project that serves as:
- **Catch-all for org-level tasks** — Tasks that don't belong to a specific project
- **Default for meetings** — Meetings that relate to the org broadly

### Lifecycle
Projects graduate through stages:
1. **Parent README** - Initial listing with basic status
2. **Dedicated file** - When needs more detail
3. **Project folder** - When substantial with multiple files

### Standard Project Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview, status, key decisions |
| `next-steps.md` | Resumption context — what's in progress, next actions |
| `context/` | Reference materials, background docs |

### next-steps.md Guide

This file enables quick context restoration. Track these 5 things:

1. **Current state** — what's done, what's in progress
2. **Blockers** — what's preventing progress (awaiting input, dependencies)
3. **Next actions** — concrete next steps, ordered by priority
4. **Open questions** — decisions pending, clarifications needed
5. **Context pointers** — links to relevant meetings, docs, or task IDs

**Update after every work session** — future you (or another agent) will thank you.

---

## Diary

- **Location**: `diary/YYYY/MM/DD-DOW.md`
- **Update Priority**: Project docs are primary, diary is secondary
  - Detailed notes go in project folders (README.md, next-steps.md)
  - Diary is a brief log of what happened, not the canonical record
- **Include**: meetings, tasks completed, knowledge base changes, decisions
- **Keep it brief**: Reference project docs rather than duplicating content

---

## Subagents

The following subagents are available in `.claude/agents/`:

| Agent | Purpose | Triggers |
|-------|---------|----------|
| `cowork` | Research, email drafts, project context | "research", "draft email", "context" |
| `chase` | Follow-up tracking | "chase", "follow up", "waiting on" |
| `meeting-prep` | Meeting preparation | "prep for meeting", "prepare for call" |
| `setup-review` | Audit files and DB consistency | "review setup", "check consistency", "audit files" |
| `weekly-review` | Week review and planning | "weekly review", "what did I accomplish" |
| `writer` | Long-form document drafting | "draft document", "write brief/proposal" |
| `people` | Relationship context | "who is", "brief me on", "context on" |

All agents can read and write to working-memory for context persistence.

### When to Delegate

**Delegate when:**
- Task matches an agent's specialty (see triggers above)
- Task requires deep focus on a single domain (research, writing, review)
- Task is complex enough to benefit from specialized instructions
- User explicitly requests an agent-style workflow

**Handle directly when:**
- Quick questions or simple updates
- Task spans multiple domains (e.g., update task + write diary + send notification)
- Following up on work an agent started
- Routine operations (checking tasks, updating diary)

### Delegation Examples

| User Request | Action |
|--------------|--------|
| "What did I accomplish this week?" | Delegate to `weekly-review` |
| "Draft an email to John about the budget" | Delegate to `cowork` |
| "Review my setup for consistency issues" | Delegate to `setup-review` |
| "Who is Sarah Chen?" | Delegate to `people` |
| "Write a project proposal for X" | Delegate to `writer` |
| "Mark T-42 complete" | Handle directly (simple task op) |
| "What's on my plate today?" | Handle directly (quick query) |
| "Update the diary with today's meeting" | Handle directly (routine) |
| "Research X and then create tasks from findings" | Handle directly (multi-step, spans domains) |

### After Delegation

When an agent completes work:
1. Review what they produced
2. Update working-memory with key outcomes
3. Handle any follow-up actions they couldn't do
4. Notify user of completion if significant content was created

---

## Database Sync Requirements

The task database must stay in sync with the filesystem:

| Entity | CLI Command |
|--------|-------------|
| **Organization** | `tcli orgs-create <slug> "Name" --short-name XX` |
| **Project folder** | `tcli projects-create <slug> <name> --org <org>` |
| **Person** | `tcli people-create <name> --org <org>` |
| **Meeting** | `tcli sync meeting <path>` |
| **Workstream file** | `tcli sync file <path>` |

**Keep filesystem and database in sync** — organizations and projects must exist in DB before tasks can reference them.

---

## Routines

Routines are recurring task templates with schedules. They auto-generate task instances.

### Managing Routines

```bash
# View due routines
tcli routines due

# View all routines
tcli routines list

# Check-ins (relationship touchpoints)
tcli checkins
```

### Routine Types

| Type | Purpose | Example |
|------|---------|---------|
| **Check-in** | Relationship maintenance | "Catch up with X every 2 weeks" |
| **Review** | Periodic reviews | "Weekly project review" |
| **Admin** | Recurring admin tasks | "Submit invoice on 1st of month" |

### Creating Routines

Routines are created via the web UI or task CLI. Each routine has:
- **Title** — what to do
- **Schedule** — interval or cron pattern
- **Project** — where the generated tasks belong
- **Priority** — default priority for generated tasks
