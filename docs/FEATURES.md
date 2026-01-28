# Features Guide

This document explains KnowledgeWork's features, why they exist, and how they're implemented. Read this to understand the "what" and "why" before diving into architecture details.

---

## Core Concepts

### Tasks (Items)

The central unit of work. Everything actionable is an "Item" in the database, with a type field distinguishing tasks, workstreams, and goals.

| Type | Purpose | Example |
|------|---------|---------|
| `task` | Single actionable item | "Review Q1 budget" |
| `workstream` | Ongoing area of work | "Nuclear Tracker Development" |
| `goal` | Target outcome with deadline | "Launch MVP by Q2" |

**Statuses:**
- `pending` - Not started
- `in_progress` - Actively working
- `blocked` - Waiting on something (tracked via blockers)
- `complete` - Done
- `cancelled` - Explicitly dropped
- `deferred` - Intentionally paused

**Why this design:**
- Single `Item` table with type field avoids schema duplication
- Status is explicit (no "done" boolean that hides nuance)
- Blocking is a first-class concept with many-to-many relationships

**Architecture:**
- `Item` table in Prisma schema
- `items.ts` router for CRUD
- `query.ts` router for complex queries (today, overdue, blocked)

---

### Due Dates vs Check-ins

Two distinct concepts for surfacing tasks at the right time:

| Concept | Purpose | When it triggers | What happens if missed |
|---------|---------|------------------|------------------------|
| **Due Date** | Hard deadline | Task appears in "due today" | Marked OVERDUE |
| **Check-in** | Soft reminder | Task appears in "check-ins due" | Just a reminder |

**Due Date (`--due`)**
- One per task
- "This must be done by X"
- Examples: "Submit report by Friday", "Prep before 2pm meeting"

**Check-ins**
- Multiple per task
- "Remind me to look at this around X"
- Examples: "Follow up with John next week", "Review progress monthly"

**Critical distinction:**
- Check-ins are reminders for the **main user** to follow up
- The task may be owned by someone else (e.g., "John to review doc")
- The check-in is YOUR reminder to chase John

**Why separate concepts:**
- Mixing deadlines and reminders causes confusion
- A delegated task has no deadline for you, but you need reminders to chase
- Long-running projects need periodic review without fake deadlines

**Architecture:**
- `dueDate` field on Item (nullable DateTime)
- `ItemCheckIn` table (many check-ins per item)
- `tcli checkins` shows items where check-in date has arrived
- `tcli overdue` shows items past due date

---

### People & Ownership

People are stored in the database, not hardcoded. Each person can have roles on tasks.

**Ownership:**
- `owner` = who is responsible for completing the task
- Default: main user (from `.claude/context/background.md`)
- Explicit: "John to review doc" → owner is John

**Roles (via ItemPerson junction table):**

| Role | Meaning | Example |
|------|---------|---------|
| `assignee` | Primary owner (redundant with ownerId) | - |
| `waiting_on` | Blocked waiting for this person | "Waiting on Sarah for approval" |
| `reviewer` | Will review when done | "James to review PR" |
| `stakeholder` | Interested party | "Keep Alice informed" |
| `cc` | FYI only | - |

**Why this design:**
- Tasks often involve multiple people in different capacities
- "Waiting on X" is common and worth tracking explicitly
- Enables queries like "show me everything blocked on John"

**Architecture:**
- `Person` table with org relationship
- `ItemPerson` junction table with `role` field
- `tcli waiting` shows tasks with `waiting_on` roles
- `tcli people John` shows all tasks involving John

---

### Projects & Organizations

Two-level hierarchy for grouping work:

```
Organization (client/context)
  └── Project (initiative/workstream)
        └── Tasks
```

**Organizations:**
- Top-level grouping (clients, personal, etc.)
- Examples: "Acme Corp", "Personal", "Consulting"
- Have optional color for UI badges

**Projects:**
- Specific initiatives within an org
- Have status (active, paused, complete)
- Can have parent/child relationships
- Each org has a `_general` project for ungrouped tasks

**Why this design:**
- Work naturally groups by client/context first
- Projects within a client are the actual initiatives
- `_general` avoids forcing categorization for quick tasks

**Architecture:**
- `Organization` table (dynamic, not enum)
- `Project` table with `orgId` foreign key
- `tcli list --project grid-management` filters by project
- `tcli create task "X" --project acme-corp/_general` for org-level tasks

---

### Routines

Recurring tasks that repeat on a schedule (daily standup, weekly review, etc.).

**Key concepts:**
- **Template**: The routine definition (title, schedule, time)
- **Instance**: A specific occurrence (today's standup)
- **Completion**: Mark an instance done for a date

**Schedule types:**
- `daily` - Every day
- `weekly` - Specific days (e.g., Monday, Wednesday)
- `monthly` - Specific date each month

**Why separate from tasks:**
- Routines repeat forever; tasks are one-time
- Completion logic is date-based, not status-based
- Need to track skipped vs completed instances

**Architecture:**
- `Routine` table for templates
- `RoutineCompletion` table for instances
- `tcli routines due` shows today's routines
- `tcli routines complete 51` marks routine done for today

---

## AI Integration

### Real-time Notifications

When AI agents create content, they can notify the web UI via toast notifications.

**Flow:**
```
AI Agent (bash script)
    ↓
curl → tRPC mutation (notifications.aiContentCreated)
    ↓
Server emits socket.io event
    ↓
Web UI receives → shows toast
    ↓
User clicks "Open" → navigates (or refreshes if already there)
```

**Why this exists:**
- AI agents work in the background (terminal)
- User needs to know when content is ready
- Direct navigation saves context-switching

**Architecture:**
- `skills/notify-web/scripts/notify-web.sh` - CLI for agents
- `server/src/trpc/routers/notifications.ts` - tRPC endpoint
- `server/src/events.ts` - Socket.io setup
- `web/src/components/ai-content-notifier.tsx` - Toast listener

**Usage:**
```bash
.claude/skills/notify-web/scripts/notify-web.sh document \
  "Q4 Strategy Summary" \
  "acme-corp/documents/q4-strategy.md" \
  "Ready for your review"
```

---

### Smart Task Detection

AI prompts include pattern detection to avoid creating duplicate tasks and use check-ins appropriately.

**Patterns that trigger check-ins (not new tasks):**

| Pattern | Action |
|---------|--------|
| "Check in with John" | Search for John's tasks, add check-in |
| "Follow up on X" | Search for task about X, add check-in |
| "Discuss X with Y" | Search for task about X, add check-in |
| "Chase Y about X" | Search for task, add check-in |
| "Waiting on Y for X" | Search for task, add `waiting_on` role |

**Patterns that create new tasks:**

| Pattern | Action |
|---------|--------|
| "John to do X" | Create task, assign to John |
| "Ask Sarah to X" | Create task, assign to Sarah |
| No person mentioned | Create task, assign to main user |

**Why this matters:**
- "Check in with John" should NOT create a new task
- It should add a check-in to John's existing task
- Prevents duplicate tasks and uses the system correctly

**Architecture:**
- `packages/web/src/prompts/common/task-patterns.ts` - Pattern definitions
- `packages/web/src/prompts/quick-notes/task.ts` - Task creation prompt
- `skills/task-cli/SKILL.md` - Documents patterns for agents

---

### CLI for AI Agents

The `tcli` command provides a parseable interface for AI agents to manage tasks.

**Design principles:**
- Consistent tabular output (ID | STATUS | TITLE | OWNER | PROJECT)
- Predictable column order
- Exit codes: 0 = success, non-zero = error
- Errors to stderr, data to stdout

**Key commands:**
```bash
tcli list                    # All pending items
tcli today                   # Due today
tcli overdue                 # Past due
tcli checkins                # Check-ins due
tcli search "keyword"        # Search by title

tcli create task "Title" --owner Alice --project energy
tcli update T-42 --status complete
tcli checkin-add T-42 2026-02-01 --note "Follow up"
```

**Why this design:**
- AI agents parse output programmatically
- Inconsistent formats cause parsing failures
- Simple commands reduce agent errors

**Architecture:**
- `skills/task-cli/` - Skill definition and CLI
- TypeScript CLI using tRPC client
- Same type safety as web UI

---

## Sync System

### Database as Source of Truth

The database is authoritative for task state. Markdown files sync FROM the database.

**What lives where:**

| Data | Source of Truth | Synced To |
|------|-----------------|-----------|
| Task status, due date, owner | Database | Markdown (read-only) |
| Meeting actions (initial) | Markdown | Database (creates tasks) |
| Project documentation | Markdown | Database (metadata only) |
| Diary entries | Markdown | Not synced |

**Sync operations:**
```bash
tcli sync meeting path/to/meeting.md    # Parse meeting → create tasks
tcli sync file path/to/workstream.md    # Sync workstream metadata
tcli sync item T-42                     # Push DB changes to file
```

**Why this design:**
- Single source of truth prevents conflicts
- Markdown is human-readable but not authoritative
- Meeting notes create tasks, then DB tracks status

**Architecture:**
- `server/src/services/file-sync.ts` - Bidirectional sync
- `server/src/services/meeting-parser.ts` - Meeting action extraction
- `sync.ts` router for sync operations

---

## User Context

### Main User Identity

The AI needs to know who "you" are for default task assignment.

**Where it's defined:**
- `.claude/context/background.md` in your content repo
- Contains your name, roles, key relationships

**How it's used:**
- Default task owner (when not specified)
- Check-ins are always for you
- Meeting action extraction ("I will do X" → your task)

**Why this design:**
- Personal info stays in content repo, not framework
- AI agents reference it dynamically
- Supports multiple users (different content repos)

---

## Summary: Feature → Architecture

| Feature | Why | Key Files |
|---------|-----|-----------|
| Check-ins | Soft reminders vs hard deadlines | `ItemCheckIn` table, `checkin-*` commands |
| People roles | Track who's blocking what | `ItemPerson` table, `waiting_on` role |
| Smart detection | Avoid duplicates, use check-ins | `task-patterns.ts`, prompts |
| Notifications | AI→User real-time updates | `events.ts`, `ai-content-notifier.tsx` |
| CLI | Parseable AI interface | `skills/task-cli/` |
| Sync | DB as truth, markdown as content | `file-sync.ts`, `meeting-parser.ts` |
