# Knowledge Work Web - Product Specification

Personal knowledge management dashboard and editor for the KnowledgeWork knowledge base.

## Vision

Replace Obsidian as the primary interface for the KnowledgeWork system, providing:
- Dense, information-rich dashboard for daily workflow
- Semantic navigation that understands content types (projects, meetings, diary)
- Full editing capabilities with WYSIWYG markdown
- Integrated Claude Code assistant
- Unified view of external systems (Todoist, Airtable, GCal)

## Target User

Single user (Alice), local deployment, no authentication required.

---

## Milestones

### Milestone 1: Dashboard + Read-Only Browsing (MVP)

Core value: At-a-glance daily status + full content browsing with semantic navigation.

#### Dashboard View

Dense, information-rich home page showing:

| Section | Content |
|---------|---------|
| **Today's Diary** | Current day's entry with tasks (🔴🟠🟡), work log, completed items |
| **Todoist Tasks** | Today's tasks pulled from Todoist API, grouped by project |
| **Upcoming Events** | Next 7 days of meetings from knowledge base + GCal |
| **Project Status Grid** | All active projects with status emoji, quick links |

#### Content Browser

Semantic navigation that understands content types:

**Projects View**
- List all projects across orgs (acme-corp, example-org, consulting, personal)
- Each project shows: README summary, status, recent activity
- Drill into project: README, next-steps, meetings, context files
- Project detection: folder with README.md, optionally next-steps.md, context/, meetings/

**Meetings View**
- Timeline of all meetings, parsed from frontmatter
- Filter by: date range, project, attendee
- Show: title, date, attendees, status, linked project
- Source: `{org}/meetings/YYYY/MM/YYYY-MM-DD-slug.md`

**Diary View**
- Calendar/timeline navigation through diary entries
- Each entry shows: summary, tasks, meetings, work log
- Quick navigation: today, this week, specific date
- Source: `diary/YYYY/MM/DD-DOW.md`

**File Browser**
- Traditional tree view as fallback
- But organised by content type, not raw filesystem
- Search across all content (full-text + frontmatter)

#### Markdown Rendering

- Full GitHub-flavoured markdown support
- Obsidian wikilinks `[[path|label]]` → internal links
- Status emoji rendering (🔴🟡🟢🟠🔵✅)
- Frontmatter parsing and display
- Code syntax highlighting
- Checkbox lists (interactive in edit mode)

#### External Integrations (Read-Only)

**Todoist**
- Fetch tasks via existing skill scripts
- Display in dashboard and inline in project views
- Show: task name, project, due date, priority

**Airtable** (stretch for M1)
- Read CRM data where referenced
- YA base: `appEfrUYW3WmviNnF`
- SV USA base: `apprSfJKiCJ5jRUP9`

---

### Milestone 2: Editing

WYSIWYG markdown editing that's better than Obsidian.

#### Editor Features

- **WYSIWYG mode**: See formatted output as you type
- **Source mode**: Raw markdown for power users
- **Split view**: Source + preview side by side
- Inline formatting toolbar
- Keyboard shortcuts (Cmd+B, Cmd+I, etc.)
- Auto-save to filesystem

#### Structured Forms

Templates with fields for common file types:

**Meeting Note Form**
- Frontmatter fields: title, date, attendees, location, project, tags
- Sections: Summary, Decisions, Actions (table with owner/action/due/status)

**Diary Entry Form**
- Sections: Summary, Work Log, Tasks for Today, Tasks Completed, Meetings, Reflections
- Task priority selector (🔴🟠🟡)

**Project README Form**
- Sections: Overview, Status, Key Decisions, Links

#### File Operations

- Create new files (with templates)
- Rename/move files
- Delete files (with confirmation)
- Git commit from UI (optional)

---

### Milestone 3: Claude Integration

Chat panel and autonomous agent mode.

#### Chat Panel

- Split view: content browser + chat sidebar
- Context-aware: Claude sees current file, project context
- Actions: ask questions, request edits, run commands
- History: persist chat per session

#### Autonomous Agent Mode

- Trigger background tasks (e.g., "update all project statuses")
- Progress notifications
- Review and approve changes before commit

#### Implementation

- Connect to Claude Code CLI or API
- Pass context (current file, project, recent changes)
- Stream responses to UI

---

### Milestone 4: Full Integrations

Read-write access to external systems.

#### Todoist

- Create/complete/update tasks from UI
- Link tasks to projects and files
- Two-way sync

#### Google Calendar

- Display events in dashboard
- Create meetings from calendar
- Link to meeting notes

#### Airtable

- View and edit CRM records
- Create interactions from meeting notes
- Search contacts

---

## Technical Architecture

### Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **State**: React Query for data fetching
- **Editor**: TipTap or Milkdown (WYSIWYG markdown)
- **Markdown**: remark/rehype ecosystem

### Data Layer

**Filesystem Access**
- Server-side: Node.js fs for reading/writing markdown
- Watch for changes (chokidar or similar)
- Parse frontmatter with gray-matter

**Content Index**
- Build index of all content on startup
- Track: file path, type, frontmatter, modified date
- Update on file change
- In-memory for M1, SQLite for scale

**External APIs**
- Todoist: REST API via skill scripts
- Airtable: MCP tools or direct API
- GCal: Google Calendar API

### Routes Structure

```
/                     → Dashboard
/diary                → Diary timeline
/diary/[year]/[month]/[day] → Specific diary entry
/projects             → Project list
/projects/[org]/[slug] → Project detail
/meetings             → Meeting list
/meetings/[org]/[year]/[month]/[slug] → Meeting detail
/browse               → File browser
/browse/[...path]     → File viewer/editor
/search               → Search interface
```

### Document Formats

See **[DOCUMENT-FORMATS.md](../../content/DOCUMENT-FORMATS.md)** for the complete specification of:
- Diary entries (location, frontmatter, sections)
- Meeting notes (required frontmatter, structure)
- Project READMEs and next-steps files
- Org-level READMEs
- Parsing guidance (wikilinks, tables, sections)
- Validation rules

This spec is shared between the web app (for parsing) and the KnowledgeWork agent (for writing).

---

## Design Principles

1. **Dense, information-rich** - Show more data at once, minimal whitespace
2. **Dark mode default** - Essential, not optional
3. **Semantic over filesystem** - Navigate by content type, not folder structure
4. **Keyboard-first** - Cmd+K command palette, vim-style shortcuts
5. **Offline-capable** - Works without internet (external integrations gracefully degrade)

---

## Technical Decisions

### Editor: TipTap

TipTap selected for WYSIWYG editing:
- Mature, well-documented, large ecosystem
- Extensible for custom nodes (wikilinks, status emoji)
- Good markdown import/export via prosemirror
- Active development and community

### File Sync Strategy

Handle concurrent edits (especially from Claude Code agent):

1. **File watching** with chokidar - detect external changes in real-time
2. **Debounced reload** - show subtle notification ("File updated externally") with refresh option
3. **Conflict detection** - if unsaved edits exist when file changes externally, warn before overwriting
4. **Optimistic concurrency** - no locking, last write wins (single user system)
5. **Auto-save** - save frequently to minimise conflict window

### Claude Code Integration: PTY + WebSocket

Goal: Full bidirectional control - web UI as alternative frontend to running Claude Code.

**Architecture:**
```
┌─────────────┐     WebSocket      ┌─────────────┐      PTY       ┌─────────────┐
│   Browser   │ ←───────────────→  │  Next.js    │ ←────────────→ │ Claude Code │
│   (React)   │   JSON messages    │  Server     │   stdin/stdout │    CLI      │
└─────────────┘                    └─────────────┘                └─────────────┘
```

**Implementation:**
1. Server spawns Claude Code in pseudo-terminal (node-pty)
2. WebSocket connection streams output to browser
3. Browser sends user input back via WebSocket
4. Server writes to Claude Code's stdin
5. Parse Claude Code output for structured rendering (tool calls, responses, etc.)

**Challenges:**
- Parsing terminal output (ANSI codes, Claude Code's custom formatting)
- Maintaining session state across page reloads
- Handling multiple concurrent sessions (probably not needed for single user)

**Alternative considered:** Shared file + hooks approach - simpler but higher latency and clunkier UX.

### Mobile: Deferred

Focus on desktop web experience first. PWA or native app consideration for future.
